import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import {
  AlertController,
  ToastController,
  ModalController,
  IonButton,
  ActionSheetController,
  Platform
} from '@ionic/angular';
import { CustomValidator } from 'src/app/validators/custom.validator';
import { ActivatedRoute } from '@angular/router';
//models
import { Staff } from 'src/app/models/staff';
//services
import { StaffService } from 'src/app/providers/logged-in/staff.service';
import { AuthService } from 'src/app/providers/auth.service';
import {Subscription} from "rxjs";
import {AwsService} from "src/app/providers/aws.service";
import {CameraService} from "src/app/providers/logged-in/camera.service";
import {SentryErrorhandlerService} from "src/app/providers/sentry.errorhandler.service";
import {JPEG_PNG_EXTENSIONS, isUnsupportedUploadError, uploadAlertMessage} from "src/app/providers/upload-formats";


@Component({
  selector: 'app-staff-form',
  templateUrl: './staff-form.page.html',
  styleUrls: ['./staff-form.page.scss'],
})
export class StaffFormPage implements OnInit {

  public loading: boolean = false;

  public saving: boolean = false;

  public staff_id;

  public model: Staff;

  public operation:string;

  public form: FormGroup;

  public type: string = 'password';

  @ViewChild('fileInput', { static: false }) fileInput: ElementRef;

  @ViewChild('btnChangePhoto', { static: false }) btnChangePhoto: IonButton;

  public progress;

  public uploadFileSubscription: Subscription;

  public currentTarget;

  constructor(
    private authService: AuthService,
    public staffService: StaffService,
    private _fb: FormBuilder,
    private alertCtrl: AlertController,
    private _toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public awsService: AwsService,
    public _cameraService: CameraService,
    public actionSheetCtrl: ActionSheetController,
    public sentryService: SentryErrorhandlerService,
    public platform: Platform
  ) {
  }

  ngOnInit() {
    window.analytics.page('Staff Form Page');

    // Load the passed model if available
    if(window['state']) {
      this.model = window['state']['model'];
    }

    //this.staff_id = this.activateRoute.snapshot.paramMap.get('staff_id');

    if(this.staff_id && !this.model) {
      this.loadData(this.staff_id);
    } else {
      this._initForm();
    }
  }

  loadData(staff_id) {

    this.loading = true;

    this.staffService.view(staff_id).subscribe(model => {
      this.model = model;

      this.loading = false;

      this._initForm();
    }, () => {

      this.loading = false;
    })
  }

  _initForm() {

    // Init Form
    if(!this.model.staff_id){ // Show Create Form
      this.operation = "Create Staff";
      this.form = this._fb.group({
        name: ["", Validators.required],
        email: ["", [Validators.required, CustomValidator.emailValidator]],
        password: ["", Validators.required],
        gmail_username: [""],
        gmail_password: [""],
        role: [null],
        job_title: ['', Validators.required],
        salary: ['', Validators.required],
        salary_currency: ['KWD', Validators.required],
        hours_per_day: ['', Validators.required],
        week_start_day: ['', Validators.required],
        work_days: ['', Validators.required],
        logo_path: [''],
        logo: [''],
        staff_notification: [1],
        permissions: [],//new FormArray(permissionsCtrls),
      });
    }else{ // Show Update Form
      this.operation = "Update Staff";

      let permissions = this.model.staffNotifications.map(e => e.permission);

      this.form = this._fb.group({
        name: [this.model.staff_name, Validators.required],
        email: [this.model.staff_email, [Validators.required, CustomValidator.emailValidator]],
        password: [this.model.staff_password_hash], // not required,
        gmail_username: [this.model.staff_gmail_username],
        gmail_password: [this.model.staff_gmail_password],
        role: [this.model.staff_role + ''],
        job_title: [this.model.staff_job_title, Validators.required],
        salary: [this.model.staff_salary, Validators.required],
        salary_currency: [this.model.staff_salary_currency, Validators.required],
        hours_per_day: [this.model.hours_per_day, Validators.required],
        week_start_day: [this.model.week_start_day, Validators.required],
        work_days: [this.model.work_days, Validators.required],
        logo_path: [this.awsService.cloudinaryUrl + 'staff-photo/' + this.model.staff_photo],
        logo: [this.model.staff_photo],
        staff_notification: [this.model.staff_notification],
        permissions: [permissions]// new FormArray(permissionsCtrls),
      });
    }
  }

  /**
   * Update Model Data based on Form Input
   */
  updateModelDataFromForm(){
    this.model.staff_name = this.form.value.name;
    this.model.staff_email = this.form.value.email;
    this.model.staff_password_hash = this.form.value.password;
    this.model.staff_gmail_username = this.form.value.gmail_username;
    this.model.staff_gmail_password = this.form.value.gmail_password;
    this.model.staff_role = this.form.value.role;
    this.model.staff_job_title = this.form.value.job_title;
    this.model.staff_salary = this.form.value.salary;
    this.model.staff_salary_currency = this.form.value.salary_currency;
    this.model.hours_per_day  = this.form.value.hours_per_day;
    this.model.week_start_day  = this.form.value.week_start_day;
    this.model.work_days  = this.form.value.work_days;
    this.model.staff_photo  = this.form.value.logo;
    this.model.permissions  = this.form.value.permissions;
  }

  /**
   * Close the page
   */
  close(){
    let data = { 'refresh': false };
    this.modalCtrl.dismiss(data);
  }

  /**
   * Save the model
   */
  async save() {

    this.saving = true;

    this.updateModelDataFromForm();

    let action;
    if(!this.model.staff_id){
      // Create
      action = this.staffService.create(this.model);
    }else{
      // Update
      action = this.staffService.update(this.model);
    }

    action.subscribe(async jsonResponse => {

      this.saving = false;

      // On Success
      if(jsonResponse.operation == "success") {

        this.model.staffNotifications = jsonResponse.staffNotifications;
        
        // Close the page
        let data = { 'refresh': true };
        this.modalCtrl.dismiss(data);

        //success toast
        let toast = await this._toastCtrl.create({
          message: "Staff Member "+this.model.staff_name+' account created successfully',
          duration: 3000
        });
        toast.present();
      }

      // On Failure
      if (jsonResponse.operation == "error") {

        let prompt = await this.alertCtrl.create({
          message: this.authService.errorMessage(jsonResponse.message),
          buttons: ["Ok"]
        });
        prompt.present();
      }
    });
  }

  togglePasswordVisibility() {
    this.type = this.type == 'password'? 'text': 'password';
  }

  /**
   * Upload logo from mobile
   */
  mobileUpload() {

    const SelectSourceLbl = 'Select image source';
    const LoadLibLbl = 'Load from Library';
    const ErrorLibLbl = 'Error getting picture from Library: ';
    const UseCamLbl = 'Use Camera';
    const ErrorCamLbl = 'Error getting picture from Camera: ';

    const arrButtons = [
      {
        text: LoadLibLbl,
        handler: () => {

          this._cameraService.getImageFromLibrary().then((nativeImageFilePath) => {
            // Upload and process for progress
            this.uploadFileViaNativeFilePath(nativeImageFilePath);
          }, async (err) => {

            const ignoreErrors = [
              'No image picked',
              'User cancelled photos app'
            ];

            if (err && ignoreErrors.indexOf(err.message) > -1) {
              return null;
            }

            const alert = await this.alertCtrl.create({
              header: 'Error getting picture from Library',
              message: err.message,
              buttons: ['Okay']
            });

            await alert.present();
            this.progress = null;
          });
        }
      },
      {
        text: UseCamLbl,
        handler: () => {

          this._cameraService.getImageFromCamera().then((nativeImageFilePath) => {
            // Upload and process for progress
            this.uploadFileViaNativeFilePath(nativeImageFilePath);
          }, async (err) => {

            const ignoreErrors = [
              'No image picked',
              'User cancelled photos app'
            ];

            if (err && ignoreErrors.indexOf(err.message) > -1) {
              return null;
            }

            const alert = await this.alertCtrl.create({
              header: 'Error getting picture from Library',
              message: err.message,
              buttons: ['Okay']
            });

            await alert.present();
            this.progress = null;
          });
        }
      }
    ];

    // Display action sheet giving user option of camera vs local filesystem.
    this.actionSheetCtrl.create({
      header: SelectSourceLbl,
      buttons: arrButtons
    }).then(actionSheet => actionSheet.present());
  }

  /**
   * Upload logo by native path
   */
  async uploadFileViaNativeFilePath(uri) {
    this.progress = 1;//show loader

    this.awsService.uploadNativePath(uri, JPEG_PNG_EXTENSIONS).then(o => {
      o.subscribe(event => {
        this._handleFileSuccess(event);
      }, async err => {

        this.progress = false;

        const ignoreErrors = [
          'No image picked',
          'User cancelled photos app',
        ];

        if (err && ignoreErrors.indexOf(err.message) > -1) {
          return null;
        }

        // log to slack/sentry to know how many user getting file upload error

        this.sentryService.handleError(err);

        // always show abstract error message

        let message;

        const networkErrors = [
          '504:null',
          'NetworkingError: Network Failure'
        ];

        // networking errors
        if (err && networkErrors.indexOf(err.message) > -1) {
          message = 'Error uploading file';
        } else if (isUnsupportedUploadError(err)) {
          message = err.message;
          // system errors
        } else if (err.message && err.message.indexOf(':') > -1) {
          message = 'Error getting file from Library';
          // plugin errors
        } else if (err.message) {
          message = err.message;
          // custom file validation errors
        } else {
          message = err;
        }

        const alert = await this.alertCtrl.create({
          header: 'Error',
          message: message,
          buttons: ['Okay']
        });

        await alert.present();
      });
    });
  }

  /**
   * Upload logo from browser
   * @param event
   */
  async browserUpload(event) {

    const fileList: FileList = event.target.files;

    if (fileList.length == 0) {
      return false;
    }

    const prefix = fileList[0].name.split('.')[0];

    const type = fileList[0].type.split('/')[0];

    if (type != 'image') {
      this.alertCtrl.create({
        message: 'Invalid File format',
        buttons: ['Ok']
      }).then(alert => { alert.present(); });
    }
    else
    {
      this.progress = 1;

      this.uploadFileSubscription = this.awsService.uploadFile(fileList[0], JPEG_PNG_EXTENSIONS).subscribe(event => {
        this._handleFileSuccess(event);
      }, async err => {

        // log to sentry

        this.sentryService.handleError(err);

        if (this.fileInput && this.fileInput.nativeElement) {
          this.fileInput.nativeElement.value = null;
        }

        const alert = await this.alertCtrl.create({
          header: 'Error',
          message: uploadAlertMessage(err, 'Error while uploading file!'),
          buttons: ['Okay']
        });

        await alert.present();

        this.progress = false;
      }, () => {
        this.uploadFileSubscription.unsubscribe();
      });
    }
  }

  /**
   * Handle logo upload api response
   * @param event
   */
  _handleFileSuccess(event) {
    // Via this API, you get access to the raw event stream.
    // Look for upload progress events.
    if (event.type === 'progress') {
      // This is an upload progress event. Compute and show the % done:
      this.progress = Math.round(100 * event.loaded / event.total);
    } else if (event.Key && event.Key.length > 0) {

      if (this.fileInput && this.fileInput.nativeElement) {
        this.fileInput.nativeElement.value = null;
      }

      const imgLarge = new Image();
      imgLarge.src = event.Location;
      imgLarge.onload = () => {

        this.form.controls['logo_path'].setValue(event.Location);
        this.form.controls['logo'].setValue(event.Key);
        this.form.controls['logo'].markAsDirty();
        this.form.updateValueAndValidity();

        this.model.staff_photo = event.Key;

        this.progress = null;

      };
    } else {
      this.currentTarget = event;
    }
  }

  /**
   * Display options to update logo
   */
  async updatePhoto(ev) {
    if (this.platform.is('capacitor')) {
      this.mobileUpload();
    } else {
      this.fileInput.nativeElement.click();
    }
  }

  /**
   * trigger click event on change logo button
   */
  triggerUpdatePhoto($event) {
    $event.stopPropagation();
    document.getElementById('upload-pic').click();
    // this.fileInput.nativeElement.click();
  }

  onchange($event) {
    this.model.staff_notification = ($event.detail.checked) ? 1 : 0;
  }

  /**
   * cancel file upload
   */
  cancelUpload() {
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = null;
    }

    this.progress = null;

    this.currentTarget.abort();
  }
}
