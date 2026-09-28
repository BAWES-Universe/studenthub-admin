import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import {
  AlertController,
  IonContent,
  LoadingController,
  ModalController,
  NavController,
  Platform,
  ToastController
} from "@ionic/angular";
import { ActivatedRoute } from "@angular/router";
import { Subscription } from 'rxjs';
//services
import { AwsService } from 'src/app/providers/aws.service';
import { SentryErrorhandlerService } from 'src/app/providers/sentry.errorhandler.service';
import { EXCEL_EXTENSIONS, uploadAlertMessage } from 'src/app/providers/upload-formats';
import { EventService as SegmentService } from 'src/app/providers/logged-in/event.service';
import { EventService } from "../../../../providers/event.service";
import { AuthService } from 'src/app/providers/auth.service';


@Component({
  selector: 'app-import',
  templateUrl: './import.page.html',
  styleUrls: ['./import.page.scss'],
})
export class ImportPage implements OnInit {

  // Html Content
  @ViewChild(IonContent) content: IonContent;

  // File input used for browser fallback when no capacitor is available
  @ViewChild('fileInput', { static: false }) fileInput: ElementRef;

  public eventName;

  public browserUploadSubscription: Subscription;

  // The Transfer containing all records
  
  public pageTitle: string = "Import Events via Excel";

  public uploading: Boolean = false;

  constructor(
    public activatedRoute: ActivatedRoute,
    public navCtrl: NavController,
    public segmentService: SegmentService,
    public awsService: AwsService,
    public sentryService: SentryErrorhandlerService,
    private authService: AuthService,
    private _alertCtrl: AlertController,
    public _toastCtrl: ToastController,
    public platform: Platform,
    public modalCtrl: ModalController,
    public eventService: EventService
  ) {
  }

  ngOnInit() {
    window.analytics.page('Import Events Form Page');
  }

  ngOnDestroy() {
    if (!!this.browserUploadSubscription) {
      this.browserUploadSubscription.unsubscribe();
    }
  }

  upload() {
    this.fileInput.nativeElement.click();
  }

  /**
   * Upload photo from browser
   * @param event
   */
  async browserUpload(event) {

    const fileList: FileList = event.target.files;

    if (fileList.length == 0) {
      return false;
    }

    this.uploading = true;

    this.browserUploadSubscription = this.awsService.uploadFile(fileList[0], EXCEL_EXTENSIONS).subscribe(event => {

      this._handleUpload(event);

    }, async err => {

      //log to slack/sentry to know how many user getting file upload error

      this.sentryService.handleError(err);

      if (this.fileInput && this.fileInput.nativeElement)
        this.fileInput.nativeElement.value = null;

      const alert = await this._alertCtrl.create({
        header: 'Error',
        message: uploadAlertMessage(err, 'Error while uploading file!'),
        buttons: ['Okay']
      });

      await alert.present();

      this.uploading = false;
    });
  }

  /**
   * Handle successfull file upload
   * @param event
   */
  _handleUpload(event) {

    // Via this API, you get access to the raw event stream.
    // Look for upload progress events.
    if (event.type === 'progress') {
      // This is an upload progress event. Compute and show the % done:
      //this.progress = Math.round(100 * event.loaded / event.total);
    } else if (event.Key && event.Key.length > 0) {

      if (this.fileInput && this.fileInput.nativeElement)
        this.fileInput.nativeElement.value = null;

      this.importExcel(event.Key);
    }
  }

  /**
   * new transfer upload excel
   * @param file
   */
  async importExcel(file) {

    this.segmentService.importExcel(this.eventName, file).subscribe(async data => {

      this.uploading = false;

      if (data.operation == 'success') {

        let prompt = await this._alertCtrl.create({
          message: data.message,
          buttons: ["Ok"]
        });
        prompt.present();

        this.dismiss({ refresh: true });
      }

      // On Failure
      if (data.operation == "error") {

        let prompt = await this._alertCtrl.create({
          message: this.authService.errorMessage(data.message),
          buttons: ["Ok"]
        });
        prompt.present();
      }
    }, () => {
      this.uploading = false;
    });
  }

  dismiss(data = {}) {
    this.modalCtrl.dismiss(data);
  }
}
