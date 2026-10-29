import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { AlertController, ToastController, ModalController } from '@ionic/angular';
import { CustomValidator } from 'src/app/validators/custom.validator';
import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';
// services
import { AuthService } from 'src/app/providers/auth.service';
import { CompanyService } from 'src/app/providers/logged-in/company.service';
// models
import { Company } from 'src/app/models/company';
import { ActivatedRoute } from '@angular/router';


@Component({
  selector: 'app-company-form',
  templateUrl: './company-form.page.html',
  styleUrls: ['./company-form.page.scss'],
})
export class CompanyFormPage implements OnInit {

  @ViewChild('ckeditor', { static: false }) ckeditor: ClassicEditor;
  @ViewChild('ckeditor_ar', { static: false }) ckeditor_ar: ClassicEditor;

  public loading = false;

  public saving = false;

  public company_id;

  public model: Company;
  
  public operation: string;
  
  public isSubCompany = 0;

  public form: FormGroup;

  public type: string = 'password';

  public editorConfig = {
    placeholder: 'Click here add description...',
    startupFocus: true,
    width: '100%',
    toolbar: ['Heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote', '|', 'indent', 'outdent'],
  };
  
  public Editor = ClassicEditor;

  constructor(
    public activateRoute: ActivatedRoute,
    public authService: AuthService,
    public companyService: CompanyService,
    private _fb: FormBuilder,
    private _alertCtrl: AlertController,
    public modalCtrl: ModalController,
    private _toastCtrl: ToastController
  ) { }

  ngOnInit() {
    window.analytics.page('Company Form Page');

    // Load the passed model if available
    // if (window.history.state && window.history.state.model) {
    //   this.model = window.history.state.model;
    // }

    // this.company_id = this.activateRoute.snapshot.paramMap.get('company_id');
    // this.isSubCompany = parseInt(this.activateRoute.snapshot.paramMap.get('subcompany'));

    if (this.company_id && !this.model) {
      this.loadData(this.company_id);
    } else {
      this._initForm();
    }
  }

  /**
   * load company detail
   * @param company_id
   */
  loadData(company_id) {
    this.loading = true;

    this.companyService.view(company_id).subscribe(bank => {
      this.model = bank;

      this.loading = false;

    }, () => {

      this.loading = false;
    });
  }

  /**
   * init form
   */
  _initForm() {

    if (this.model.parent_company_id){
      this.isSubCompany = 1;
    }
    // Init Form

    if (!this.model.company_id){ // Show Create Form

      this.operation  = (this.isSubCompany) ? 'Create Sub-company' : 'Create Company';

      if (this.isSubCompany) {
        this.form = this._fb.group({
          name: ['', Validators.required],
          bonus_commission: ['', Validators.required],
          hourly_rate: ['', Validators.required],
          common_name_en: [''],
          common_name_ar: [''],
          description_en: [''],
          description_ar: [''],
          website: [''],
        });
      } else {
        this.form = this._fb.group({
          name: ['', Validators.required],
          common_name_ar: ['', Validators.required],
          common_name_en: ['', Validators.required],
          password: ['', Validators.required],
          description_en: [''],
          description_ar: [''],
          website: ['', Validators.required],
          email: ['', [Validators.required, CustomValidator.emailValidator]],
          bonus_commission: ['', Validators.required],
          hourly_rate: ['', Validators.required],
        });
      }
    } else { // Show Update Form
      this.operation  = (this.isSubCompany) ? 'Update  Sub-company' : 'Update Company';
      if (this.isSubCompany) {
        this.form = this._fb.group({
            name: [this.model.company_name, Validators.required],
            bonus_commission: [this.model.company_bonus_commission],
            hourly_rate: [this.model.company_hourly_rate, Validators.required],
            common_name_en: [this.model.company_common_name_en, Validators.required],
            common_name_ar: [this.model.company_common_name_ar, Validators.required],
            description_en: [this.model.company_description_en],
            description_ar: [this.model.company_description_ar],
            website: [this.model.company_website],
            approved_to_hire: [this.model.company_approved_to_hire]
        });
      } else {
        this.form = this._fb.group({
            name: [this.model.company_name, Validators.required],
            email: [this.model.company_email, [Validators.required, CustomValidator.emailValidator]],
            password: [''],
            bonus_commission: [this.model.company_bonus_commission],
            hourly_rate: [this.model.company_hourly_rate, Validators.required],
            common_name_en: [this.model.company_common_name_en, Validators.required],
            common_name_ar: [this.model.company_common_name_ar, Validators.required],
            description_en: [this.model.company_description_en],
            description_ar: [this.model.company_description_ar],
            website: [this.model.company_website],
            approved_to_hire: [this.model.company_approved_to_hire]
        });
      }
    }
  }

  /**
   * Update Model Data based on Form Input
   */
  updateModelDataFromForm(){
    this.model.company_name = this.form.value.name;
    this.model.company_email = this.form.value.email;
    this.model.company_bonus_commission = this.form.value.bonus_commission;
    this.model.company_hourly_rate = this.form.value.hourly_rate;
    this.model.company_common_name_en = this.form.value.common_name_en;
    this.model.company_common_name_ar = this.form.value.common_name_ar;
    this.model.company_description_en = this.form.value.description_en;
    this.model.company_description_ar = this.form.value.description_ar;
    this.model.company_website = this.form.value.website;
    this.model.company_approved_to_hire = this.form.value.approved_to_hire;
    if (!this.isSubCompany) {
      this.model.password = this.form.value.password;
    }
  }

  /**
   * on note editor change
   * @param event
   */
   onChange(event) {

    if (!event.editor) {
      return event;
    }

    const data = event.editor.getData();

    this.form.controls['description_en'].setValue(data);
    this.form.markAsDirty();
    this.form.updateValueAndValidity();
  }

  /**
   * on note editor change
   * @param event
   */
   onArabicEditorChange(event) {

    if (!event.editor) {
      return event;
    }

    const data = event.editor.getData();

    this.form.controls['description_ar'].setValue(data);
    this.form.markAsDirty();
    this.form.updateValueAndValidity();
  }

  onEditorReady() {
    const interval = setTimeout(() => {
      if (this.ckeditor.editorInstance && this.form.value.description_en) {
        this.ckeditor.editorInstance.setData(this.form.value.description_en);
        // this.ckeditor.editorInstance.editing.view.focus();
        // clearInterval(interval);
      }
    }, 200);
  }

  onArabicEditorReady() {
    const interval = setTimeout(() => {
      if (this.ckeditor_ar.editorInstance && this.form.value.description_ar) {
        this.ckeditor_ar.editorInstance.setData(this.form.value.description_ar);
        // this.ckeditor.editorInstance.editing.view.focus();
        // clearInterval(interval);
      }
    }, 200);
  }

  /**
   * Close the page
   */
  close() {
    this.modalCtrl.dismiss({ refresh: true });
  }

  /**
   * Save the model
   */
  async save() {

    this.saving = true;

    this.updateModelDataFromForm();

    let action;

    if (!this.model.company_id) {
      // Create
      action = this.companyService.create(this.model);
    } else {
      // Update
      action =  this.companyService.update(this.model);
    }

    action.subscribe(async jsonResponse => {

      this.saving = false;

      // On Success
      if (jsonResponse.operation == 'success') {

        // Close the page
        const data = { refresh: true };
        this.modalCtrl.dismiss(data);

        const toast = await this._toastCtrl.create({
          message: this.model.company_name + ' account saved successfully',
          duration: 3000
        });
        toast.present();
      }

      // On Failure
      if (jsonResponse.operation == 'error') {

        const prompt = await this._alertCtrl.create({
          message: this.authService.errorMessage(jsonResponse.message),
          buttons: ['Ok']
        });
        prompt.present();
      }
    }, () => {
      this.saving = false;
    });
  }

  togglePasswordVisibility() {
    this.type = this.type == 'password'? 'text': 'password';
  }
}
