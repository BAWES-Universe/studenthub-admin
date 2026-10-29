import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import {ToastController, AlertController, ModalController, Platform, NavController} from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
// services
import { CompanyNoteService } from 'src/app/providers/logged-in/company-note.service';
import { StoreService } from 'src/app/providers/logged-in/store.service';
import { CompanyService } from 'src/app/providers/logged-in/company.service';
import { AwsService } from '../../../../providers/aws.service';
import { resolvedStoredImageUrl } from '../../../../providers/stored-image-url';
import { BrandService } from 'src/app/providers/logged-in/brand.service';
import { CompanyContactService } from 'src/app/providers/logged-in/company-contact.service';
import { AuthService } from 'src/app/providers/auth.service';
import { EventService } from '../../../../providers/event.service';
import { DiscountService } from 'src/app/providers/logged-in/discount.service';
// models
import { Note } from 'src/app/models/note';
import { Company } from 'src/app/models/company';
import { Store } from 'src/app/models/store';
import { File } from '../../../../models/file';
import { CompanyContact } from 'src/app/models/company-contact';
import { Discount } from 'src/app/models/discount';
import { Brand } from 'src/app/models/brand';
// pages
import { BrandFormPage } from '../brand-form/brand-form.page';
import { CompanyContactFormPage } from '../company-contact-form/company-contact-form.page';
import { CompanyFormPage } from '../company-form/company-form.page';
import { UploadFilePage } from '../upload-file/upload-file.page';
import { CompanyNoteFormPage } from '../company-note-form/company-note-form.page';
import { ModalPopPage } from '../../modal-pop/modal-pop.page';
import {StaffPage} from "src/app/pages/logged-in/picker/staff/staff.page";
import { DiscountFormPage } from '../discount/discount-form/discount-form.page';
import { DiscountViewPage } from '../discount/discount-view/discount-view.page';


@Component({
  selector: 'app-company-view',
  templateUrl: './company-view.page.html',
  styleUrls: ['./company-view.page.scss'],
})
export class CompanyViewPage implements OnInit, OnDestroy {

  public company_id;

  public pageCount = 0;
  public currentPage = 1;
  public companyNotes: Note[];
  public companyYearlyReport: any[];
  public loadingStats = false;

  public company: Company;
  public licenceStatus = '';
  public licencePreviewUrl = '';
  private licenceRequest = 0;
  private licenceSub: Subscription | null = null;
  public subCompanies: Company[] = [];
  public stores: Store[] = [];

  public brands: Brand[] = [];

  public companyContacts: CompanyContact[] = [];

  public segment: string = 'info';

  public deleting = false;
  public loading = false;
  public sendingNewPassword = false;
  public companyStatus = false;
  public companyStatusOverride: boolean = false;
  public currentYear = new Date().getFullYear();
  public followup = false;

  public updating = false;
  public exporting: boolean = false; 
  

  public deletingDiscount = false;
  public loadingDiscount = false;

  public totalCountDiscount = 0;
  public pageCountDiscount = 0;
  public currentPageDiscount = 1;

  public discounts: Discount[] = [];

  constructor(
    public platform: Platform,
    public router: Router,
    public activatedRoute: ActivatedRoute,
    public navCtrl: NavController,
    private _toastCtrl: ToastController,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    public companyService: CompanyService,
    public discountService: DiscountService,
    public companyContactService: CompanyContactService,
    public brandService: BrandService,
    public storeService: StoreService,
    public authService: AuthService,
    public noteService: CompanyNoteService,
    public aws: AwsService,
    public eventService: EventService,
  ) { }

  ngOnInit() {
    window.analytics.page('Company View Page');

    // Load the passed model if available
    if (window.history.state) {
      this.company = window.history.state.model;
    }

    this.company_id = this.activatedRoute.snapshot.paramMap.get('company_id');

    this.loadData();
    this.loadContacts();
    this.yearlyReport(this.currentYear);

    this.eventService.transferUpdated$.subscribe(_ => {
      this.loadData();
    });
  }

  /**
   * load compay data
   */
  async loadData(silent = false) {

    if (!silent) {
      this.loading = true;
    }

    // if initialize
    this.companyStatus = !!(this.company && this.company.company_status);
    this.companyStatusOverride = !!(this.company && this.company.company_status_override);
    this.followup = !!(this.company && this.company.company_followup);

    this.companyService.view(this.company_id).subscribe(response => {

      this.loading = false;
      this.deleting = false;

      this.company = response;
      this.loadLicence();

      // if load
      this.companyStatus = !!(this.company.company_status);
      this.companyStatusOverride = !!(this.company && this.company.company_status_override);
      this.followup = !!(this.company.company_followup);

      this.subCompanies = response.subCompanies;
      this.stores = response.stores;

      this.brands = response.brands;

    }, () => {
      this.loading = false;
      this.deleting = false;
    });
  }

  /**
   * download candidate details
   * @param ev 
   */
  async downloadCandidatesExcel(ev){
    ev.preventDefault();
    ev.stopPropagation();
    const confirm = await this.alertCtrl.create({
      header: 'Export Data?',
      message: 'Do you really wants to export candidate data?',
      buttons: [
        {
          text: 'Yes',
          handler: () => {

            this.exporting = true;
             
            this.companyService.downloadCandidatesExcel(this.company_id).subscribe(async jsonResp => {
              this.exporting = false;
            });
          }
        },
        {
          text: 'No',
          role: 'no'
        }
      ]
    });
    confirm.present();
  }

  segmentChanged(event) {
    this.segment = event.detail.value;
    if (this.segment == 'notes') {
      if (!this.companyNotes || this.companyNotes.length == 0) {
        this.loadNotesData(1);
      }
    } else if(this.segment == "discounts") {
      this.loadDiscounts(this.currentPageDiscount);
    }
  }

  /**
   * load data
   * @param page
   */
  async loadDiscounts(page: number, silent = false) {

    if (!silent) {
      this.loadingDiscount = true;
    }

    const urlParams = "&company_id=" + this.company.company_id;

    this.discountService.list(page, urlParams).subscribe(response => {

      this.loadingDiscount = false;
      this.deletingDiscount = false;

      this.pageCountDiscount = parseInt(response.headers.get('X-Pagination-Page-Count'));
      this.currentPageDiscount = parseInt(response.headers.get('X-Pagination-Current-Page'));
      this.totalCountDiscount = parseInt(response.headers.get('X-Pagination-Total-Count'));

      this.discounts = response.body;
    }, () => {
      this.loadingDiscount = false;
      this.deletingDiscount = false;
    });
  }

  /**
   * load more on scroll to bottom
   * @param event
   */
  doInfiniteDiscounts(event) {

    this.currentPageDiscount++;

    this.loadingDiscount = true;

    const urlParams = "&company_id=" + this.company.company_id;

    this.discountService.list(this.currentPage, urlParams).subscribe(response => {

      this.loadingDiscount = false;

      this.pageCountDiscount = parseInt(response.headers.get('X-Pagination-Page-Count'));
      this.currentPageDiscount = parseInt(response.headers.get('X-Pagination-Current-Page'));

      this.discounts = this.discounts.concat(response.body);

      event.target.complete();

    }, () => {
      this.loadingDiscount = false;
    });
  }

  /**
   * When its selected
   */
  async discountSelected(model) {

    /*this.router.navigate(['discount-view', model.discount_uuid], {
      state: {
        model: model
      }
    });*/

    window.history.pushState({ navigationId: window.history.state.navigationId }, null, window.location.pathname);
 
    const modal = await this.modalCtrl.create({
      component: DiscountViewPage,
      componentProps: {
        model: model
      }
    });
    modal.onDidDismiss().then(e => {

      if (!e.data || e.data.from != 'native-back-btn') {
        window['history-back-from'] = 'onDidDismiss';
        window.history.back();
      }
    });
    modal.present();
  }

  /**
   * Loads the create page
   */
  async createDiscount() {
    window.history.pushState({ navigationId: window.history.state.navigationId }, null, window.location.pathname);

    let model = new Discount;
    model.company_id = this.company.company_id; 

    const modal = await this.modalCtrl.create({
      component: DiscountFormPage,
      componentProps: {
        model: model,
        company: this.company
      }
    });
    modal.onDidDismiss().then(e => {

      if (!e.data || e.data.from != 'native-back-btn') {
        window['history-back-from'] = 'onDidDismiss';
        window.history.back();
      }

      if (e && e.data && e.data.refresh) {
        this.currentPageDiscount = 1;
        this.loadDiscounts(this.currentPageDiscount);
      }
    });
    modal.present();
  }

  async editDiscount(ev, model: Discount) {

    ev.preventDefault();
    ev.stopPropagation(); 

    window.history.pushState({ navigationId: window.history.state.navigationId }, null, window.location.pathname);

    const modal = await this.modalCtrl.create({
      component: DiscountFormPage,
      componentProps: {
        model: model,
        company: this.company
      }
    });
    modal.onDidDismiss().then(e => {

      if (!e.data || e.data.from != 'native-back-btn') {
        window['history-back-from'] = 'onDidDismiss';
        window.history.back();
      }

      if (e && e.data && e.data.refresh) {
        this.currentPageDiscount = 1;
        this.loadDiscounts(this.currentPageDiscount);
      }
    });
    modal.present();
  }

  /**
   * Delete the provided model
   */
  async deleteDiscount(ev, model: Discount) {

    ev.preventDefault();
    ev.stopPropagation();

    const confirm = await this.alertCtrl.create({
      header: 'Delete Discount?',
      message: 'Are you sure you want to delete this Discount?',
      buttons: [
        {
          text: 'Yes',
          handler: () => {

            this.deletingDiscount = true;

            this.discountService.delete(model).subscribe(async jsonResp => {

              if (jsonResp.operation == 'error') {

                this.deletingDiscount = false;

                const alert = await this.alertCtrl.create({
                  header: 'Deletion Error!',
                  subHeader: jsonResp.message,
                  buttons: ['OK']
                });
                alert.present();
              }

              if (jsonResp.operation == 'success') {
                const toast = await this._toastCtrl.create({
                  message: jsonResp.message,
                  duration: 3000
                });
                toast.present();
              }
              this.loadDiscounts(this.currentPageDiscount, true);
            }, () => {
              this.deleting = false;
            });
          }
        },
        {
          text: 'No'
        }
      ]
    });
    confirm.present();
  }

  /**--- end discount code--- */

  /**
   * Loads Form in modal to update
   */
  async update() {
    window.history.pushState({ navigationId: window.history.state.navigationId }, null, window.location.pathname);

    const modal = await this.modalCtrl.create({
      component: CompanyFormPage,
      componentProps: {
        model: this.company,
        company_id: this.company_id,
        subcompany: 0
      }
    });
    // Refresh List if required
    modal.onDidDismiss().then(e => {

      if (!e.data || e.data.from != 'native-back-btn') {
        window['history-back-from'] = 'onDidDismiss';
        window.history.back();
      }

      if (e && e.data && e.data.refresh) {
        this.loadData(true);
      }
    });
    modal.present();
  }

  /**
   * Load company detail page when its selected from the list
   * @param model
   */
  rowSelected(model) {
    this.router.navigate(['company-view', model.company_id], {
      state: {
        model
      }
    });
  }

  /**
   * Create a new company
   * @param parent_company_id
   * @param subcompany
   */
  async create(parent_company_id: number, isSubcompany: boolean = false) {
    window.history.pushState({ navigationId: window.history.state.navigationId }, null, window.location.pathname);

    const company = new Company();

    company.parent_company_id = parent_company_id;

    const modal = await this.modalCtrl.create({
      component: CompanyFormPage,
      componentProps: {
        model: company,
        company_id: company.company_id,
        subcompany : isSubcompany
      }
    });
    modal.onDidDismiss().then(e => {

      if (!e.data || e.data.from != 'native-back-btn') {
        window['history-back-from'] = 'onDidDismiss';
        window.history.back();
      }

      if (e && e.data && e.data.refresh) {
        this.loadData(true);
      }
    });
    modal.present();
  }

  /**
   * push select company data to store view
   * @param model
   */
  storeSelected(model) {
    this.router.navigate(['store-view', model.store_id], {
      state: {
        model
      }
    });
  }

  /**
   * form to add new brand
   */
  async addBrand() {
    window.history.pushState({ navigationId: window.history.state.navigationId }, null, window.location.pathname);

    const brand = new Brand;
    brand.company_id = this.company_id;

    const modal = await this.modalCtrl.create({
      component: BrandFormPage,
      componentProps: {
        model: brand
      }
    });
    modal.onDidDismiss().then(e => {

      if (!e.data || e.data.from != 'native-back-btn') {
        window['history-back-from'] = 'onDidDismiss';
        window.history.back();
      }

      if (e && e.data && e.data.refresh) {
        this.loadData(true);
      }
    });
    modal.present();
  }

  /**
   * update company follow up interval in week
   */
  async updateFollowupInterval() {
    const alert = await this.alertCtrl.create({
      header: 'Follow up',
      inputs: [
        {
          name: 'interval',
          type: 'number',
          value: this.company.company_followup_interval_weeks,
          placeholder: 'Enter interval in weeks'
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Submit',
          handler: (data) => {

            this.updating = true;

            this.companyService.updateFollowupInterval(this.company_id, data.interval).subscribe(async resp => {
              this.updating = false;

              if (resp.operation != 'success') {
                const prompt = await this.alertCtrl.create({
                  header: 'Error!',
                  message: resp.message,
                  buttons: ['Ok']
                });
                prompt.present();
              }
              else
              {
                this.company.company_followup_interval_weeks = data.interval;
              }

            }, () => {
              this.updating = false;
            });
          }
        }
      ]
    });
    alert.present();
  }

  /**
   * delete brand
   * @param event
   * @param brand
   */
  async deleteBrand(event, brand) {

    event.preventDefault();
    event.stopPropagation();

    const confirm = await this.alertCtrl.create({
      header: 'Delete Brand',
      message: 'Do you want to delete this brand?',
      buttons: [
        {
          text: 'Yes',
          handler: () => {

            this.deleting = true;

            this.brandService.delete(brand).subscribe(async jsonResp => {

              // On Success
              if (jsonResp.operation == 'success') {
                const toast = await this._toastCtrl.create({
                  message: jsonResp.message,
                  duration: 3000
                });
                toast.present();

                this.loadData(true);
              }

              // On Failure
              if (jsonResp.operation == 'error') {

                this.deleting = false;

                // failer text
                const prompt = await this.alertCtrl.create({
                  header: 'Deletion Error!',
                  message: jsonResp.message,
                  buttons: ['Ok']
                });
                prompt.present();
              }

            });
          }
        },
        {
          text: 'No'
        }
      ]
    });
    confirm.present();
  }

  async addNote(note: Note) {
    window.history.pushState({ navigationId: window.history.state.navigationId }, null, window.location.pathname);

    const modal = await this.modalCtrl.create({
      component: CompanyNoteFormPage,
      componentProps: {
        company: this.company,
        note,
      }
    });
    modal.present();
    modal.onDidDismiss().then(e => {

      if (!e.data || e.data.from != 'native-back-btn') {
        window['history-back-from'] = 'onDidDismiss';
        window.history.back();
      }
    });

    const { data } = await modal.onWillDismiss();

    if (data && data.refresh) {
      this.loadData(true);
    }
  }

  /**
   * removing note
   * @param event
   * @param note
   */
  async removeNote(event, note) {

    event.preventDefault();
    event.stopPropagation();

    const confirm = await this.alertCtrl.create({
      header: 'Delete Note',
      message: 'Do you want to delete this note?',
      buttons: [
        {
          text: 'Yes',
          handler: () => {

            this.deleting = true;

            this.noteService.delete(note).subscribe(async response => {

              this.deleting = false;

              if (response.operation == 'success') {
                this.loadData(true);
              } else {

                this.deleting = false;

                // failer text
                const prompt = await this.alertCtrl.create({
                  header: 'Deletion Error!',
                  message: response.message,
                  buttons: ['Ok']
                });
                prompt.present();
              }
            }, () => {
              this.deleting = false;
            });
          }
        },
        {
          text: 'No'
        }
      ]
    });
    confirm.present();
  }

  loadContacts() {
    this.companyContactService.companyContacts(this.company_id).subscribe(data => {
      this.companyContacts = data;
    });
  }

  /**
   * onn contact selected
   * @param companyContact
   */
  async onContactSelected(companyContact) {
    this.router.navigate(['company-contact-view', companyContact.contact_uuid, this.company.company_id], {
      state: {
        model: companyContact
      }
    });
  }

  /**
   * add new contact to company
   */
  async addCompanyContact() {
    window.history.pushState({ navigationId: window.history.state.navigationId }, null, window.location.pathname);

    const companyContact = new CompanyContact();
    companyContact.company_id = this.company.company_id;

    const modal = await this.modalCtrl.create({
      component: ModalPopPage,
      componentProps: {
        activatedRoutePath: CompanyContactFormPage,
        activatedRoutePathProps: {
          companyContact: companyContact
        }
      }
    });

    modal.onDidDismiss().then(e => {

      if (!e.data || e.data.from != 'native-back-btn') {
        window['history-back-from'] = 'onDidDismiss';
        window.history.back();
      }

      if (e && e.data && e.data.refresh) {
        this.loadContacts();

        /*this.eventService.reloadStats$.next({
          company_id: this.company.company_id
        });*/
      }
    });
    modal.present();
  }

  doNothing(event) {
    event.stopPropagation();
  }

  async deleteContact(event, companyContact) {

    event.preventDefault();
    event.stopPropagation();

    const confirm = await this.alertCtrl.create({
      header: 'Delete Contact',
      message: 'Do you want to delete this contact?',
      buttons: [
        {
          text: 'Yes',
          handler: () => {

            this.deleting = true;

            this.companyContactService.delete(companyContact).subscribe(async response => {

              this.deleting = false;

              if (response.operation == 'success')
              {
                this.companyContacts = this.companyContacts.filter(e => e.contact_uuid != companyContact.contact_uuid);
              }
              else
              {
                const prompt = await this.alertCtrl.create({
                  message: this.authService.errorMessage(response.message),
                  buttons: ['Ok']
                });
                prompt.present();
              }
            }, () => {
              this.deleting = false;
            });
          }
        },
        {
          text: 'No'
        }
      ]
    });
    confirm.present();
  }

  /**
   * open brand edit page
   * @param brand
   */
  async brandSelected(brand) {
    this.navCtrl.navigateForward('brand-view/' + brand.brand_uuid, {
      state: {
        model: brand
      }
    });
  }

  async editSelected(ev, brand) {

    ev.preventDefault();
    ev.stopPropagation();

    window.history.pushState({ navigationId: window.history.state.navigationId }, null, window.location.pathname);

    const modal = await this.modalCtrl.create({
      component: BrandFormPage,
      componentProps: {
        model: brand
      }
    });
    modal.onDidDismiss().then(e => {

      if (!e.data || e.data.from != 'native-back-btn') {
        window['history-back-from'] = 'onDidDismiss';
        window.history.back();
      }

      if (e && e.data && e.data.refresh) {
        this.loadData(true);
      }
    });
    modal.present();
  }

  /**
   * Show confirm alert to reset password
   */
  async resetPassword() {
    const alert = await this.alertCtrl.create({
      header: 'Confirm password reset',
      message: 'Do you want to send new password to company?',
      buttons: [
        {
          text: 'No',
          role: 'cancel'
        },
        {
          text: 'Yes',
          handler: () => {
            this.sendNewPassword();
          }
        }
      ]
    });
    alert.present();
  }

  /**
   * Reset and email the candidate a new password
   */
  async sendNewPassword() {

    this.sendingNewPassword = true;

    this.companyService.resetPassword(this.company).subscribe(async response => {

      this.sendingNewPassword = false;

      if (response.operation == 'error')
      {
        const toast = await this._toastCtrl.create({
          message: response.message,
          duration: 3000
        });

        toast.present();
      }
      else
      {
        const alert = await this.alertCtrl.create({
            header: 'Reset Password',
            subHeader: 'New password sent to company',
            buttons: ['Okay']
          });
        alert.present();
      }
    }, () => {
      this.sendingNewPassword = false;
    });
  }

  /**
   * Delete the provided model
   */
  async delete(ev, company: Company) {

    ev.preventDefault();
    ev.stopPropagation();

    const confirm = await this.alertCtrl.create({
      header: 'Delete Company',
      message: 'Do you want to delete this Company?',
      buttons: [
        {
          text: 'Yes',
          handler: () => {

            this.deleting = true;

            this.companyService.delete(company).subscribe(async jsonResp => {

              // On Success
              if (jsonResp.operation == 'success') {
                const toast = await this._toastCtrl.create({
                  message: jsonResp.message,
                  duration: 3000
                });
                toast.present();

                this.loadData(true);
              }

              // On Failure
              if (jsonResp.operation == 'error') {

                this.deleting = false;

                // failer text
                const prompt = await this.alertCtrl.create({
                  header: 'Deletion Error!',
                  message: jsonResp.message,
                  buttons: ['Ok']
                });
                prompt.present();
              }

            });
          }
        },
        {
          text: 'No'
        }
      ]
    });
    confirm.present();
  }

  /**
   * Delete the provided model
   */
  async deleteDoc(ev, file: File) {

    ev.preventDefault();
    ev.stopPropagation();

    const confirm = await this.alertCtrl.create({
      header: 'Delete Document',
      message: 'Do you want to delete this Document?',
      buttons: [
        {
          text: 'Yes',
          handler: () => {

            this.deleting = true;

            this.companyService.deleteDoc(file).subscribe(async jsonResp => {

              // On Success
              if (jsonResp.operation == 'success') {
                const toast = await this._toastCtrl.create({
                  message: jsonResp.message,
                  duration: 3000
                });
                toast.present();

                this.loadData(true);
              }

              // On Failure
              if (jsonResp.operation == 'error') {

                this.deleting = false;

                // failer text
                const prompt = await this.alertCtrl.create({
                  header: 'Deletion Error!',
                  message: jsonResp.message,
                  buttons: ['Ok']
                });
                prompt.present();
              }

            });
          }
        },
        {
          text: 'No'
        }
      ]
    });
    confirm.present();
  }

  async uploadDocument() {
    window.history.pushState({ navigationId: window.history.state.navigationId }, null, window.location.pathname);

    const modal = await this.modalCtrl.create({
      component: UploadFilePage,
      componentProps: {
        company: this.company,
      }
    });
    modal.present();
    modal.onDidDismiss().then(e => {

      if (!e.data || e.data.from != 'native-back-btn') {
        window['history-back-from'] = 'onDidDismiss';
        window.history.back();
      }
    });

    const { data } = await modal.onWillDismiss();

    if (data && data.refresh) {
      this.loadData();
    }
  }

  async editDoc(event, file) {

    event.preventDefault();
    event.stopPropagation();

    window.history.pushState({ navigationId: window.history.state.navigationId }, null, window.location.pathname);

    const modal = await this.modalCtrl.create({
      component: UploadFilePage,
      componentProps: {
        company: this.company,
        file,
      }
    });
    modal.present();
    modal.onDidDismiss().then(e => {

      if (!e.data || e.data.from != 'native-back-btn') {
        window['history-back-from'] = 'onDidDismiss';
        window.history.back();
      }
    });

    const { data } = await modal.onWillDismiss();
    if (data && data.refresh) {
      this.loadData();
    }
  }

  toggleFollowup($event) {

    this.followup = $event.detail.checked;

    this.company.company_followup = $event.detail.checked;

    this.updating = true;

    this.companyService.updateFollowup(this.company).subscribe(async response => {

      this.updating = false;

      if (response && response.operation == 'success') {
        const toast = await this._toastCtrl.create({
          message: response.message,
          duration: 3000
        });
        toast.present();
        this.eventService.reloadCompanyList$.next({});
      }

    }, () => {
      this.updating = false;
    });
  }

  /**
   * Make date readable by Safari
   * @param date
   */
  toDate(date) {
    if (date) {
      return new Date(date.replace(/-/g, '/'));
    }
  }

  /**
   * update status
   * @param $event
   */
  changeStatus($event) {

    this.companyStatusOverride = $event.detail.checked;
    this.companyStatus = $event.detail.checked;

    this.updating = true;

    const status = ($event.detail.checked) ? 1 : 0;

    this.companyService.changeStatus(this.company, status).subscribe(async response => {

      this.updating = false;

      if (response && response.operation == 'success') {

        this.eventService.reloadCompanyList$.next({});

        const toast = await this._toastCtrl.create({
          message: response.message,
          duration: 3000
        });
        toast.present();
      }

    }, () => {
      this.updating = false;
    });
  }

  logoSrc(company: Company): string | null {
    return resolvedStoredImageUrl(company?.company_logo_url, company?.company_logo, this.aws.cloudinaryUrl);
  }

  showLogo(company: Company): boolean {
    const src = this.logoSrc(company);
    return !!src && company?.logo_failed_src !== src;
  }

  markLogoUnavailable(company: Company) {
    company.logo_failed_src = this.logoSrc(company);
  }

  loadLicence() {
    const request = ++this.licenceRequest;
    if (this.licenceSub) {
      this.licenceSub.unsubscribe();
      this.licenceSub = null;
    }
    if (!this.company || !this.company.commercial_licence) {
      this.releaseLicencePreview();
      this.licenceStatus = 'none';
      return;
    }
    this.licenceStatus = 'loading';
    this.licenceSub = this.companyService.openLicence(this.company.company_id).subscribe((blob) => {
      if (request !== this.licenceRequest) {
        return;
      }
      this.releaseLicencePreview();
      this.licencePreviewUrl = URL.createObjectURL(blob);
      this.licenceStatus = 'ready';
    }, (error) => {
      if (request !== this.licenceRequest) {
        return;
      }
      if (error && error.status === 401) {
        this.licenceStatus = 'auth';
        return;
      }
      this.licenceStatus = this.licencePreviewUrl ? 'ready' : 'unavailable';
    });
  }

  ngOnDestroy() {
    this.licenceRequest++;
    if (this.licenceSub) {
      this.licenceSub.unsubscribe();
      this.licenceSub = null;
    }
    this.releaseLicencePreview();
  }

  private releaseLicencePreview() {
    if (this.licencePreviewUrl) {
      URL.revokeObjectURL(this.licencePreviewUrl);
      this.licencePreviewUrl = '';
    }
  }

  openLicence(event: Event) {
    event.preventDefault();
    if (this.licencePreviewUrl) {
      window.open(this.licencePreviewUrl, '_blank', 'noopener');
    }
  }

  /**
   * load company data
   * @param page
   * @param silent
   */
  async loadNotesData(page: number, silent = false) {

    if (!silent) {
      this.loading = true;
    }
    const searchParams = '&expand=createdBy,updatedBy&company_id=' + this.company_id;
    this.noteService.list(page, searchParams).subscribe(response => {

      this.pageCount = parseInt(response.headers.get('X-Pagination-Page-Count'));
      this.currentPage = parseInt(response.headers.get('X-Pagination-Current-Page'));

      this.companyNotes = response.body;
      this.loading = false;

    }, () => {
      this.loading = false;
    });
  }

  /**
   * load more companies on scroll to bottom
   * @param event
   */
  doInfinite(event) {

    this.currentPage++;

    this.loading = true;
    const searchParams = '&expand=createdBy,updatedBy&company_id=' + this.company_id;
    this.noteService.list(this.currentPage, searchParams).subscribe(response => {

      this.pageCount = parseInt(response.headers.get('X-Pagination-Page-Count'));
      this.currentPage = parseInt(response.headers.get('X-Pagination-Current-Page'));

      const companies = response.body;
      this.companyNotes = this.companyNotes.concat(companies);
      this.loading = false;
      event.target.complete();
    }, () => {
    });
  }

  yearlyReport(year = null) {
    this.currentYear = year;
    this.loadingStats = true;
    this.companyService.viewYearReport(this.company_id, year).subscribe(response => {
      this.companyYearlyReport = response;
      this.loadingStats = false;
    }, () => {
    });
  }
  convertStringToInt(str){
    return parseInt(str);
  }

  async updateManagedBy(event) {
      window.history.pushState({ navigationId: window.history.state.navigationId }, null, window.location.pathname);

      const modal = await this.modalCtrl.create({
        component: StaffPage,
        componentProps: {
          popup: true
        }
      });
      modal.onDidDismiss().then(e => {

        if (!e.data || e.data.from != 'native-back-btn') {
          window['history-back-from'] = 'onDidDismiss';
          window.history.back();
        }
        if (e.data) {
          this.updating = true;
          this.updateStaff(e.data);
        }
      });
      modal.present();
  }

  updateStaff(staff) {
    this.companyService.updateStaff(this.company, staff.staff_id).subscribe(async response => {

      this.updating = false;

      if (response && response.operation == 'success') {

        this.loadData();
        this.eventService.reloadCompanyList$.next({});

        const toast = await this._toastCtrl.create({
          message: response.message,
          duration: 3000
        });
        toast.present();
      }

    }, () => {
      this.updating = false;
    });
  }
}
