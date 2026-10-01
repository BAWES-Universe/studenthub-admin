import {Component, OnInit, ViewChild, ElementRef, OnDestroy, Input} from '@angular/core';
import { Subscription } from 'rxjs';
import {AlertController, ModalController, Platform, ToastController} from '@ionic/angular';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
// Services
import { SentryErrorhandlerService } from 'src/app/providers/sentry.errorhandler.service';
import { BACKEND_UPLOAD_EXTENSIONS, acceptAttribute, uploadAlertMessage } from 'src/app/providers/upload-formats';
import { AwsService } from 'src/app/providers/aws.service';
import {CompanyService} from '../../../../providers/logged-in/company.service';
//models
import {File} from '../../../../models/file';


@Component({
  selector: 'app-upload-file',
  templateUrl: './upload-file.page.html',
  styleUrls: ['./upload-file.page.scss'],
})
export class UploadFilePage implements OnInit, OnDestroy {

  @ViewChild('fileInput', { static: false }) fileInput: ElementRef;

  public fileModel: File = new File();
  public company;
  @Input() file;
  public progress = null;
  public form: FormGroup;
  public loading = false;

  public dirty = false;
  public saving = false;

  public currentTarget;
  public tempLocation;
  public acceptedFormats = acceptAttribute(BACKEND_UPLOAD_EXTENSIONS);

  public filePickSubscription: Subscription;
  public browserUploadSubscription: Subscription;
  public uploadSubscription: Subscription;

  constructor(
    public platform: Platform,
    public modalCtrl: ModalController,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public fb: FormBuilder,
    public companyService: CompanyService,
    public sentryService: SentryErrorhandlerService,
    public awsService: AwsService
  ) {

  }

  ngOnInit() {
    window.analytics.page('Upload File Page');

    if (this.file) {
      this.fileModel = this.file;
    }

    this._initForm();
  }

  ngOnDestroy() {

    if (!!this.uploadSubscription) {
      this.uploadSubscription.unsubscribe();
    }

    if (!!this.filePickSubscription) {
      this.filePickSubscription.unsubscribe();
    }

    if (!!this.browserUploadSubscription) {
      this.browserUploadSubscription.unsubscribe();
    }
  }

  /**
   * is given extension is valid/allowed for file upload
   * @param extension
   */
  isValidExtension(extension) {

    const allowedExtensions = [];

    const arrExt = ['pdf'];

    for (const ext of arrExt) {
      allowedExtensions.push(ext.replace('.', ''));
    }

    return allowedExtensions.indexOf(extension) > -1;
  }

  /**
   * Upload file in browser platform
   * @param event
   */
  browserUpload(event) {

    const fileList: FileList = event.target.files;

    if (fileList.length == 0) {
      return null;
    }

    this.progress = 1; // show loader

    this.browserUploadSubscription = this.awsService.uploadFile(fileList[0], BACKEND_UPLOAD_EXTENSIONS).subscribe(event => {
      this._handleFileSuccess(event);
    },
      async err => {
        // log to slack/sentry to know how many user getting file upload error

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

        this.progress = null;
      });
  }

  /**
   * Handle file upload success
   * @param event
   */
  public _handleFileSuccess(event) {

    // Via this API, you get access to the raw event stream.
    // Look for upload progress events.
    if (event.type === 'progress') {
      // This is an upload progress event. Compute and show the % done:
      this.progress = Math.round(100 * event.loaded / event.total);

    } else if (event.Key && event.Key.length > 0) {

      if (this.fileInput && this.fileInput.nativeElement) {
        this.fileInput.nativeElement.value = null;
      }
      this.dirty = true;
      this.form.controls['file'].setValue(event.Key);
      this.form.controls['file'].markAsDirty();
      this.fileModel.file_s3_path = event.Key;
      this.tempLocation = event.Location;
      this.progress = false;
    } else {
      this.currentTarget = event;
    }
  }

  /**
   * close popup modal
   */
  dismiss(data = {}) {
    this.modalCtrl.getTop().then(overlay => {
      if (overlay) {
        this.modalCtrl.dismiss(data);
      }
    });
  }

  /**
   * cancel file upload
   */
  cancelUpload() {
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = null;
    }

    this.progress = null;

    this.loading = false;

    this.currentTarget.abort();
  }

  /**
   * return extension of uploaded file
   */
  get uploadedFileExtension() {
    const a = this.fileModel.file_s3_path.split('.');

    if (a) {
      return a[a.length - 1];
    }

    return null;
  }

  /**
   * init form
   */
  _initForm() {
      this.form = this.fb.group({
        title: [this.file ? this.file.file_title : '', Validators.required],
        desc: [this.file ? this.file.file_description : ''],
        file: [this.file ? this.file.file_s3_path : '', Validators.required]
      });
  }

  async save(){
    this.saving = true;
    this.loadModelData();

    const model = (this.fileModel.file_uuid) ?
        this.companyService.updateFile(this.fileModel) :
        this.companyService.createFile(this.fileModel);

    model.subscribe( async jsonResponse => {
      this.saving = false;

      // On Success
      if (jsonResponse.operation == 'success') {

        // open view page
        this.dismiss({refresh: true});

        const toast = await this.toastCtrl.create({
          message: jsonResponse.message,
          duration: 3000
        });
        toast.present();
      }

      // On Failure
      if (jsonResponse.operation == 'error') {
        let html = '';

        for (const i in jsonResponse.message) {
          for (const j of jsonResponse.message[i]) {
            html += j + '<br />';
          }
        }

        const prompt = await this.alertCtrl.create({
          message: html,
          buttons: ['Ok']
        });
        prompt.present();
      }
    });
  }

  loadModelData(){
    this.fileModel.file_title = this.form.value.title;
    this.fileModel.file_description = this.form.value.desc;
    this.fileModel.company_id = this.company.company_id;
  }
}
