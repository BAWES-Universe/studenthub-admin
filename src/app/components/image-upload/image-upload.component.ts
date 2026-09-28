import {Component, ElementRef, forwardRef, Input, OnInit, Renderer2, ViewChild} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {ActionSheetController, AlertController, Platform} from '@ionic/angular';

import {AwsService} from '../../providers/aws.service';
import {CameraService} from '../../providers/camera.service';
import { BACKEND_IMAGE_EXTENSIONS, acceptAttribute, uploadAlertMessage } from '../../providers/upload-formats';

@Component({
  selector: 'app-image-upload',
  templateUrl: './image-upload.component.html',
  styleUrls: ['./image-upload.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ImageUploadComponent),
      multi: true
    }
  ]
})
export class ImageUploadComponent implements ControlValueAccessor, OnInit {
  // File input used for browser fallback when no cordova is available
    @ViewChild('fileInput') fileInput: ElementRef;

  // Default value the form element should have
  // (In case an image has already been uploaded for it)
  _value: string;

  // Icon to use, by default its a regular image icon
  @Input() label = 'Photo';
  // Icon to use, by default its a regular image icon
  @Input() icon = 'image-outline';
  // File prefix when uploading to S3
  @Input() prefix = 'image';
  public acceptedFormats = acceptAttribute(BACKEND_IMAGE_EXTENSIONS);

  // Used for link generation after upload
  public bucketUrl: string;
  private bucketUrlTemporary: string;
  private bucketUrlPermanent: string;

  // Progress variables
  public isUploading = false;

  // the method set in registerOnChange, it is just
  // a placeholder for a method that takes one parameter,
  // we use it to emit changes back to the form
  private propagateChange = (_: any) => {};

  constructor(
    private platform: Platform,
    private renderer: Renderer2,
    private awsService: AwsService,
    private cameraService: CameraService,
    private actionSheetCtrl: ActionSheetController,
    private alertCtrl: AlertController,
  ) {
    this.bucketUrlPermanent = this.awsService.permanentBucketUrl + 'photos/';
    this.bucketUrlTemporary = this.awsService.bucketUrl;

    // By Default, use the permanent bucket url
    this.bucketUrl = this.bucketUrlPermanent + 'photos/';
  }

  ngOnInit() {
    if (this.prefix == 'photo' || this.prefix == 'logo') {
      this.bucketUrl = this.awsService.cloudinaryUrl;
    } else if(this.prefix == "discount-category") {
      this.bucketUrlPermanent = this.awsService.permanentBucketUrl + 'discount-category/';
      this.bucketUrl = this.bucketUrlPermanent ;
    }else if(this.prefix == "discount") {
      this.bucketUrlPermanent = this.awsService.permanentBucketUrl + 'discount/';
      this.bucketUrl = this.bucketUrlPermanent;
    }
  }

  /**
   * Upload Photo button clicked
   * - On Native device, load native camera/gallery
   * - On Browser, trigger a click on the html file input
   */
  async uploadBtnClicked(event){
    // If already uploading, do nothing, just return
    if (this.isUploading) { return; }

    if (this.platform.is('cordova')){
      // Display action sheet giving user option of camera vs local filesystem.
      const actionSheet = await this.actionSheetCtrl.create({
        header: 'Select image source',
        buttons: [
          {
            text: 'Load from Library',
            handler: () => {
              this.cameraService.getImageFromLibrary().then((nativeImageFilePath) => {
                // Upload and process for progress
                this.uploadFileViaNativeFilePath(nativeImageFilePath);
              }, (err) => {
                // Error getting picture
                // alert("Error getting picture from Library: " + JSON.stringify(err));
                console.log('Error getting picture from Library: ' + JSON.stringify(err));
              });
            }
          },
          {
            text: 'Use Camera',
            handler: () => {
              this.cameraService.getImageFromCamera().then((nativeImageFilePath) => {
                // Upload and process for progress
                this.uploadFileViaNativeFilePath(nativeImageFilePath);
              }, (err) => {
                // Error getting picture
                // alert("Error getting picture from Camera: " + JSON.stringify(err));
                console.log('Error getting picture from Camera: ' + JSON.stringify(err));
              });
            }
          }
        ]
      });
      actionSheet.present();

    }else{
      // Trigger click event on regular HTML file input
      // let event = new MouseEvent('click', {bubbles: true});
      // this.renderer.invokeElementMethod(this.fileInput.nativeElement, 'dispatchEvent', [event]);
      // this.renderer.selectRootElement(this.fileInput.nativeElement).scrollIntoView()
      // this.fileInput.nativeElement.focus();
      // this.renderer.selectRootElement('#fileInput').focus();
      this.fileInput.nativeElement.click();    // And also this with @ViewChild
    }
  }


  /**
   * Upload the selected file through regular HTML file input
   * This method will only be called if the target is not a cordova app.
   * @param  {any} $event
   */
  uploadFileViaHtmlFileInput($event){
    const fileList: FileList = $event.target.files;

    // Check if files available
    if (fileList.length > 0){
      const file = fileList.item(0);

      // Upload The File
      const uploadObservable = this.awsService.uploadFile(file, BACKEND_IMAGE_EXTENSIONS);
      this.processFileUpload(uploadObservable);
    }
  }

  /**
   * Upload the selected file through regular HTML file input
   * This method will only be called if the target is not a cordova app.
   * @param  {any} path
   */
  uploadFileViaNativeFilePath(path) {
    // Upload and process for progress
    this.awsService.uploadNativePath(path, BACKEND_IMAGE_EXTENSIONS)
      .then((uploadObservable) => {
        this.processFileUpload(uploadObservable);
      })
      .catch((err) => {
        alert(err);
      });
  }

  /**
   * Process S3 upload by subscribing to progress observable
   * @param  {} uploadObservable
   */
  processFileUpload(uploadObservable) {
    // Create Temporary Transfer Record
    const newUpload = {
      name: 'Preparing file for upload',
      status: 'uploading',
      loaded: 0,
      total: 100,
      link: ''
    };

    // Show File Upload Indicator based on which file is being uploaded
    this.isUploading = true;

    // Process Upload and Display Progress
    uploadObservable.subscribe((progress) => {
     
      // Update progress, possibly create emitter for this data if needed
      if (progress.loaded &&  progress.loaded != progress.total){
        newUpload.status = 'uploading';
        newUpload.loaded = progress.loaded;
        newUpload.total = progress.total;
      }
      // If Multipart upload (big file), Key with capital "K"
      if (progress.key || progress.Key){
        newUpload.name = progress.key ? progress.key : progress.Key;
        newUpload.link = this.bucketUrlTemporary + newUpload.name;
      }
    }, async (err) => {

      newUpload.status = 'error';
      const alert = await this.alertCtrl.create({
        header: 'Error',
        message: uploadAlertMessage(err, 'Error while uploading file!'),
        buttons: ['Okay']
      });
      await alert.present();
      // Hide File Upload Indicator based on which file is being uploaded
      this.isUploading = false;
    }, () => {
      newUpload.status = 'complete';
      // Hide File Upload Indicator based on which file is being uploaded
      this.isUploading = false;
      // Switch to temporary bucket url
      this.bucketUrl = this.bucketUrlTemporary;
      // Set the new value of this file upload
      this.value = newUpload.name;
    });
  }

  /**
   * Getter for Value
   */
  get value() {
    return this._value;
  }
  /**
   * Setter for Value
   */
  set value(val) {
    this._value = val;
    // Notify of changes
    this.propagateChange(this._value);
  }

  /**
   * ControlValueAccessor interface methods
   * - They allow this component to be used as a form element (with validation and ngModel)
   */

  /**
   * Called on form Init / Update
   * @param {*} obj
   */
  writeValue(obj: any) {
    if (obj) {
      this.value = obj;
    }
  }

  /**
   * Propogate change on change, notify outside world of changes
   * @param {any} fn
   */
  registerOnChange(fn) {
    this.propagateChange = fn;
  }

  /**
   * Called on touch/ element blur
   */
  registerOnTouched() {}


}
