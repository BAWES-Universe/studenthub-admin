import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, AlertController, ToastController, Platform } from '@ionic/angular';
// models
import { Company } from 'src/app/models/company';
// services
import { CompanyService } from 'src/app/providers/logged-in/company.service';
import { AuthService } from 'src/app/providers/auth.service';
import { AwsService } from '../../../../providers/aws.service';
import { resolvedStoredImageUrl } from '../../../../providers/stored-image-url';
import { EventService } from '../../../../providers/event.service';
// pages
import { CompanyFormPage } from '../company-form/company-form.page';
import { StaffPage } from "src/app/pages/logged-in/picker/staff/staff.page";


@Component({
  selector: 'app-company-list',
  templateUrl: './company-list.page.html',
  styleUrls: ['./company-list.page.scss'],
})
export class CompanyListPage implements OnInit {

  public pageCount = 0;
  public totalCount = 0;
  public currentPage = 1;
  public segment = 1;

  public companies: Company[];
  public enableCompanies: Company[] = [];
  public disableCompanies: Company[] = [];
  
  public deleting = false;

  public loading = false;
  public exporting = false;

  public filters: {
    name: string,
    status: any,
    approved_to_hire: any
    staff: any,
    last_payment_from: string,
    last_payment_to: string
  } = {
      name: null,
      status: 4,
      approved_to_hire: null,
      staff: 0,
      last_payment_from: null, 
      last_payment_to: null
    };

  constructor(
    public router: Router,
    public platform: Platform,
    public companyService: CompanyService,
    public awsService: AwsService,
    private _modalCtrl: ModalController,
    private _alertCtrl: AlertController,
    private _toastCtrl: ToastController,
    public authService: AuthService,
    public eventService: EventService
  ) { 
  }

  ngOnInit() {
    window.analytics.page('Company List Page');

    this.loadData(1);

    this.eventService.reloadCompanyList$.subscribe(res => {
      this.loadData(1);
    });
  }

  /**
   * load company data
   * @param page
   * @param silent
   */
  async loadData(page: number, silent = false) {

    if (!silent) {
      this.loading = true;
    }
    const searchParams = this.urlParams();
    this.companyService.list(page, searchParams).subscribe(response => {

      this.pageCount = parseInt(response.headers.get('X-Pagination-Page-Count'));
      this.currentPage = parseInt(response.headers.get('X-Pagination-Current-Page'));
      this.totalCount = parseInt(response.headers.get('X-Pagination-Total-Count'));

      this.companies = response.body;
      this.loading = false;
      this.deleting = false;

    }, () => {
      // this.deleting = false;
    });
  }

  /**
   * load more companies on scroll to bottom
   * @param event
   */
  doInfinite(event) {

    this.currentPage++;

    this.loading = true;
    const searchParams = this.urlParams();
    this.companyService.list(this.currentPage, searchParams).subscribe(response => {

      this.pageCount = parseInt(response.headers.get('X-Pagination-Page-Count'));
      this.currentPage = parseInt(response.headers.get('X-Pagination-Current-Page'));

      const companies = response.body;
      this.companies = this.companies.concat(companies);
      this.loading = false;
      event.target.complete();
    }, () => {
    });
  }

  /**
   * When its selected
   */
  rowSelected(model) {
    this.router.navigate(['company-view', model.company_id], {
      state: {
        model
      }
    });
  }

  /**
   * Loads the create page
   */
  async create() {
    window.history.pushState({ navigationId: window.history.state.navigationId }, null, window.location.pathname);

    const modal = await this._modalCtrl.create({
      component: CompanyFormPage,
      componentProps: {
        model: new Company(),
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
        this.loadData(1);
      }
    });
    modal.present();
  }

  /**
   * Delete the provided model
   */
  async delete(ev, company: Company) {

    ev.preventDefault();
    ev.stopPropagation();

    const confirm = await this._alertCtrl.create({
      header: 'Delete Company?',
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

                this.loadData(this.currentPage, true);
              }

              // On Failure
              if (jsonResp.operation == 'error') {

                this.deleting = false;

                const prompt = await this._alertCtrl.create({
                  header: 'Deletion Error!',
                  message: jsonResp.message,
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
          text: 'No',
          role: 'no'
        }
      ]
    });
    confirm.present();
  }

  logoSrc(company: Company): string | null {
    return resolvedStoredImageUrl(company?.company_logo_url, company?.company_logo, this.awsService.cloudinaryUrl);
  }

  showLogo(company: Company): boolean {
    const src = this.logoSrc(company);
    return !!src && company?.logo_failed_src !== src;
  }

  markLogoUnavailable(company: Company) {
    company.logo_failed_src = this.logoSrc(company);
  }

  resetStatus() {
    this.filters = {
      name: this.filters.name,
      status: 4,
      approved_to_hire: null,
      staff: 0,
      last_payment_from: null, 
      last_payment_to: null 
    };

    this.loadData(1); // reload all result
  }

  resetFilter() {
    this.filters = {
      name: null,
      status: 4,
      approved_to_hire: null,
      staff: 0,
      last_payment_from: null, 
      last_payment_to: null 
    };

    this.loadData(1); // reload all result
  }

  /**
   * Return url string to filter list
   */
  urlParams() {
    let urlParams = '';

    if (this.filters.name) {
      urlParams += '&name=' + this.filters.name;
    }

    if (this.filters.status) {
      urlParams += '&status=' + this.filters.status;
    }

    if ([0, 1].indexOf(this.filters.approved_to_hire) > -1) {
      urlParams += '&approved_to_hire=' + this.filters.approved_to_hire;
    }

    if (this.filters.staff) {
      urlParams += '&staff_id=' + this.filters.staff.staff_id;
    }

    if (this.filters.last_payment_from) {
      urlParams += '&last_payment_from=' + this.filters.last_payment_from;
    }

    if (this.filters.last_payment_to) {
      urlParams += '&last_payment_to=' + this.filters.last_payment_to;
    }

    return urlParams;
  }

  /*
  async selectDate(last_payment_from = true) {

    if (last_payment_from && this.filters.last_payment_to) {
      this.filters.last_payment_from = null;
      this.filters.last_payment_to = null;
      return true;
    }

    const options: CalendarModalOptions = {
      pickMode: 'range',
      title: 'Select Date',
      canBackwardsSelected: true,
    };

    const myCalendar = await this.modalCtrl.create({
      component: CalendarModal,
      componentProps: { options }
    });

    myCalendar.present();

    const event: any = await myCalendar.onDidDismiss();

    const date = event.data;

    if (date) {
      this.filters.last_payment_from = date.from.string;
      this.filters.last_payment_to = date.to.string;
    }

    this.loadAllData();
  }*/

  searchByName($event) {
    this.filters.name = $event.detail.value;
    this.loadData(1); // reload all result
  }

  filterByStatus($event, status) {

    if(this.filters.status == status) {
      this.filters.status = null;
    } else {
      this.filters.status = status;
    }

    this.loadData(1); // reload all result
  }

  filterByApprovedToHire($event, status) {

    if(this.filters.approved_to_hire == status) {
      this.filters.approved_to_hire = null;
    } else {
      this.filters.approved_to_hire = status;
    }

    this.loadData(1); // reload all result
  }

  async exportData(ev){
    ev.preventDefault();
    ev.stopPropagation();
    const confirm = await this._alertCtrl.create({
      header: 'Export Data?',
      message: 'Do you really wants to export company data?',
      buttons: [
        {
          text: 'Yes',
          handler: () => {

            this.exporting = true;
            const searchParams = this.urlParams();
            this.companyService.downloadExcel(searchParams).subscribe(async jsonResp => {
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

  /**
   * filter by staff
   * @param event
   */
  async filterByStaff(event) {

    /*if(this.filters.staff) {
      this.filters.staff = 0;
      this.loadData(1);
      return false;
    }*/

    window.history.pushState({ navigationId: window.history.state.navigationId }, null, window.location.pathname);

    const modal = await this._modalCtrl.create({
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
        this.filters.staff = e.data;
        //this.loadData(1);
      }
    });
    modal.present();
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
}
