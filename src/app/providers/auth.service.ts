import { Injectable, RendererFactory2 } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { NativeStorage } from '@awesome-cordova-plugins/native-storage/ngx';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { AlertController, LoadingController } from '@ionic/angular';
import { catchError, first, take, map, retryWhen } from 'rxjs/operators';
import { empty, Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Storage } from '@ionic/storage-angular';
import { RouterStateSnapshot, ActivatedRouteSnapshot, UrlTree, Router } from '@angular/router';
// services
import { EventService } from './event.service';
import { StorageService } from './storage.service';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
//import { TranslateLabelService } from './translate-label.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  public renderer;

  public isLogin = false;
  public navEnable = false;

  // Logged in agent details
  private _accessToken;
  public id: number;
  public name: string;
  public email: string;
  public admin_limited_access: any;
  public theme: string;
  public currency_pref: string = "KWD";

  public currencies = [];

  private _urlBasicAuth = '/auth/login';
  public _urlLoginAuth0 = '/auth/login-auth0';
  public _urlLoginByGoogle = '/auth/login-by-google';
  private _urlTwoStep = '/auth/login-two-step';
  
  constructor(
    public storage: Storage,
    public storageService: StorageService,
    public auth: Auth0Service,
    public rendererFactory: RendererFactory2,
    public _http: HttpClient,
    public router: Router,
    //public translate: TranslateLabelService,
    public alertCtrl: AlertController,
    public loadingCtrl: LoadingController,
    private eventService: EventService
  ) {
    this.renderer = this.rendererFactory.createRenderer(null, null);
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    /**
     * new router changes don't wait for startup service
     * https://github.com/angular/angular/issues/14615
     */
    return new Promise(async resolve => {

      this.navEnable = true;

      if (route.data['navDisable']) {
        this.navEnable = false;
      }

      if (this.isLogin) {
        resolve(true);
      }

      this.storageService.get('loggedInAdmin').then(ret => {

        const user = JSON.parse(ret.value);//ret;//

        if (user) {

          this.isLogin = true;
          this._accessToken = user.token;
          this.id = user.id;
          this.name = user.name;
          this.email = user.email;
          this.admin_limited_access = user.admin_limited_access;
          this.theme = user.theme;

          resolve(true);
        } else {
          resolve(false);
          this.router.navigate(['login']);
          //this.logout('invalid access from canActivate');
        }
      }).catch(r => {
        this.eventService.errorStorage$.next({});
      });
    });
  }

  // This is the method you want to call at bootstrap
  async load(): Promise<any> {
    
    //if(!this.storageService._storage)
    //  this.storageService._storage = await this.storage.create();

    this.storageService.get('currency_pref').then(ret => {
      if(ret.value)
        this.currency_pref = ret.value;
    });
    
    await this.storageService.get('loggedInAdmin').then(ret => {

      const admin = JSON.parse(ret.value);//ret;// 

      if (admin && admin.token) {
        return this.setAccessToken(admin);
      } else {
        // return this.logout('error with store variables',true);
      }
    }).catch(r => {
      this.eventService.errorStorage$.next({});
    });

    this.storageService.get('theme').then(ret => {

      if (ret.value) {
        this.setTheme(ret.value);
      }
    }).catch(r => {
      this.eventService.errorStorage$.next({});
    });
  }

  /**
   * Get Access Token from Service or Cookie
   * @returns {string} token
   */
  getAccessToken(redirect = false) {

    // Return Access Token if set already
    if (this._accessToken) {
      return this._accessToken;
    }

    this.storageService.get('loggedInAdmin').then(ret => {
      const user = JSON.parse(ret.value);//ret;//

      if (user) {
        this.setAccessToken(user, redirect);
        this._accessToken = user.token;
      }
    }).catch(r => {
      this.eventService.errorStorage$.next({});
    });

    return this._accessToken;
  }

  /**
   * Logs a user out by setting logged in to false and clearing token from storage
   * @param {string} [reason]
   * @param {boolean} [silent]
   */
  logout(reason?: string, silent = false) {

    this.isLogin = false;

    // Remove from Storage then process logout

    this._accessToken = null;
    this.id = null;
    this.name = null;
    this.email = null;
    this.admin_limited_access = null;

    this.storageService.clear().catch(r => {
      this.eventService.errorStorage$.next({});
    });

    if (!silent) {
      this.eventService.userLogout$.next({
        'logoutReason': reason,
        'silent': silent
      });
    }
  }

  /**
   * set app theme
   * @param theme
   */
  setTheme(theme) {
    this.storageService.set('theme', theme).then(() => {
    }).catch(r => {
      this.eventService.errorStorage$.next({});
    });

    this.theme = theme;

    if (theme == 'night') {
      this.renderer.removeClass(document.body, 'day');
      this.renderer.addClass(document.body, 'night');
    } else {
      this.renderer.addClass(document.body, 'day');
      this.renderer.removeClass(document.body, 'night');
    }
  }

  /**
   * Set the access token
   */
  setAccessToken(response, redirect = false) {

    this._accessToken = response.token;
    this.id = response.id;
    this.name = response.name;
    this.email = response.email;
    this.admin_limited_access = response.admin_limited_access;

    window.analytics.identify(this.id, {
      name: this.name,
      email: this.email,
    });

    // Save to Storage
    this.saveInStorage();

    if (this._accessToken) {
      this.isLogin = true;
      this.eventService.userLogin$.next({ redirect });
    }
  }

  /**
   * Save user data in storage
   */
  saveInStorage() {
  
    if(this.currency_pref) {
      this.storageService.set("currency_pref", this.currency_pref);
    }

    if(this._accessToken) {
        
      this.storageService.set('loggedInAdmin', JSON.stringify({
          token: this._accessToken? this._accessToken: null,
          id: this.id? this.id: null,
          name: this.name? this.name: null,
          email: this.email? this.email: null,
          admin_limited_access: this.admin_limited_access? this.admin_limited_access: null
      })).catch(r => {
        this.eventService.errorStorage$.next({});
      });
    }
  }

  loginTwoStep(grecaptchaToken: string, token: string, otp: string): Observable<any> {
     
    const authHeader = new HttpHeaders({
      'Content-Type': 'application/json',
      "Currency": this.currency_pref || "KWD",
      'g-recaptcha-response': grecaptchaToken
    });
 
    const url = environment.apiEndpoint + this._urlTwoStep;

    return this._http.post(url, {
      token: token,
      otp: otp
    }, {
      headers: authHeader
    });/*
      .pipe(
        take(1),
        // map((res: Response) => res)
      );*/
  }

  /**
   * Basic auth, exchanges access details for a bearer access token to use in
   * subsequent requests.
   * @param  {string} email
   * @param  {string} password
   */
  basicAuth(email: string, password: string, token: string): Observable<any> {
    // Add Basic Auth Header with Base64 encoded email and password

    const authHeader = new HttpHeaders({
      'Content-Type': 'application/json',
      "Currency": this.currency_pref || "KWD",
      Authorization: 'Basic ' + btoa(unescape(encodeURIComponent(`${email}:${password}`))),
      'g-recaptcha-response': token
    });
 
    const url = environment.apiEndpoint + this._urlBasicAuth;// + '?token=' + token;

    return this._http.get(url, {
      headers: authHeader
    });/*
      .pipe(
        take(1),
        // map((res: Response) => res)
      );*/
  }


  /**
   * show login error message
   * @param message
   */
  async showLoginError(message = null) {
    const alert = await this.alertCtrl.create({
      message: message? message: 'Error getting login',
      buttons: ['Okay']
    });
    await alert.present();
  }

  /**
   * Login by Google for mobile app
   */
  loginByGoogle() {

    GoogleAuth.signIn().then(async googleUser => {
 
      if (googleUser && googleUser.authentication && googleUser.authentication.idToken) {
        this.useGoogleIdTokenForAuth(googleUser.authentication.idToken, false);
      } else {
        this.eventService.googleLoginFinished$.next({});

        this.showLoginError('Error getting login by Google+ API');
      }
    }).catch(async err => {

      console.error(err);

      this.eventService.googleLoginFinished$.next({});

      if (err = 'popup_closed_by_user') {
        return false;
      }

      this.showLoginError('Error getting login by Google+ API');
    }); 
  }
  
  /**
   * Login by google idToken
   */
  async useGoogleIdTokenForAuth(idToken, showLoader = true) {

    let loading;

    if (showLoader) {
      loading = await this.loadingCtrl.create({
        spinner: 'crescent',
        message: 'Logging in...'
      });
      loading.present();
    }

    const url = environment.apiEndpoint + this._urlLoginByGoogle;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      "Currency": this.currency_pref || "KWD",
      Language: "en"
    });
    
    return this._http.post(url, {
      idToken: idToken,
    }, {
      headers: headers
    })
      .pipe(
        //retryWhen(genericRetryStrategy()),
        catchError((err) => this._handleError(err)),
        first(),
        map((res) => res)
      )
      .subscribe(async response => {

        if (response.operation == 'success') {

          this.handleLogin(response, 'Google');

        } else if (response.operation == 'error') {
          const alert = await this.alertCtrl.create({
            message: 'Error getting login by Google+ API', // JSON.stringify(err)
            buttons: ['Okay']
          });
          await alert.present();

        }

        this.eventService.googleLoginFinished$.next({});

      }, err => {

        this.eventService.googleLoginFinished$.next(err);
      },
      () => {
        if (loading) {
          loading.dismiss();
        }
      });
  }

  /**
   * Handle response from api call to get login/register by google token or otp
   * @param response
   */
  handleLogin(response, channel) {

    if (response.operation === 'success') {
 
      /*this.analyticsService.track("Log In", { 
        login_method: channel
      })*/

      this.setAccessToken(response, true);

    } else {

      this.alertCtrl.create({
        message: response.message,
        buttons: ['Okay']
      }).then(alert => {
        alert.present();
      });
    }
  }

  /**
   * Login by Auth0 accessToken
   */
  async useTokenForAuth(accessToken, showLoader = true) {

    let loading;

    if (showLoader) {
      loading = await this.loadingCtrl.create({
        spinner: 'crescent',
        message: 'Logging in...'
      });
      loading.present();
    }

    const url = environment.apiEndpoint + this._urlLoginAuth0;

    const headers = this._buildAuthHeaders();

    return this._http.post(url, {
      accessToken: accessToken,
    }, {
      headers: headers
    })
      .pipe(
        //retryWhen(genericRetryStrategy()),
        catchError((err) => this._handleError(err)),
        first(),
        map((res) => res)
      )
      .subscribe(async (response: any) => {

        if (response.operation == 'success') {

          this.setAccessToken(response, true);

        } else if (response.code == 1) {

          const alert = await this.alertCtrl.create({
            message: 'No account with login email', // JSON.stringify(err)
            buttons: ['Okay']
          });
          await alert.present();

          this.auth.logout({ returnTo: document.location.origin });

        } else if (response.operation == 'error') {

          const alert = await this.alertCtrl.create({
            message: 'Error getting login by Auth0 API', // JSON.stringify(err)
            buttons: ['Okay']
          });
          await alert.present();

        }

        //this.eventService.googleLoginFinished$.next({});

      }, err => {

        //this.eventService.googleLoginFinished$.next(err);
      },
      () => {
        if (loading) {
          loading.dismiss();
        }
      });
  }

  _buildAuthHeaders() {
    return new HttpHeaders({
      //Language: this.language_pref || 'en',
      'Content-Type': 'application/json',
      "Currency": this.currency_pref || "KWD"
    });
  }

  isString(x) {
    return Object.prototype.toString.call(x) === "[object String]"
  }

  /**
   * json to string error message
   * @param message
   */
  errorMessage(message): string {

    if (this.isString(message)) {
      return message + '';
    }

    const a = [];

    for (const i in message) {

      if (!Array.isArray(message[i])) {
        a.push(message[i]);
        continue;
      }

      for (const j of message[i]) {
        a.push(j);
      }
    }

    return a.join('<br />');
  }

  /**
   * Handles Caught Errors from All Authorized Requests Made to Server
   * @returns {Observable}
   */
  public _handleError(error: any): Observable<any> {

    let errMsg = (error.message) ? error.message :
      error.status ? `${error.status} - ${error.statusText}` : 'Server error';

    // Handle Bad Requests
    // This error usually appears when agent attempts to handle an
    // account that he's been removed from assigning
    if (error.status === 400) {
      //this.eventService.agentRemoved$.next({});
      return empty();
    }

    // Handle No Internet Connection Error

    if (error.status == 0 || error.status == 504) {
      this.eventService.internetOffline$.next({});
      //this._auth.logout("Unable to connect to Pogi servers. Please check your internet connection.");
      return empty();
    }

    if (!navigator.onLine) {
      this.eventService.internetOffline$.next({});
      return empty();
    }

    // Handle Expired Session Error
    if (error.status === 401) {
      this.logout('Session expired, please log back in.');
      return empty();
    }

    // Handle internal server error - 500
    if (error.status === 500) {
      this.eventService.error500$.next({
        message: error.message
      });
      return empty();
    }

    // Handle page not found - 404 error
    if (error.status === 404) {
      this.eventService.error404$.next({});
      return empty();
    }

    console.error(JSON.stringify(error));

    return throwError(errMsg);
  }

  restrictedAccess() {

    return true;

    // khalid and meet access
    /*if (this.id == 1 || this.id == 7 || this.id == 10) {
      return true;
    }
    return false;*/
  }
}
