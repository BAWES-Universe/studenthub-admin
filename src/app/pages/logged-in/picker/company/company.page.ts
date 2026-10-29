import { Component, OnInit } from '@angular/core';
import { ModalController, Platform } from '@ionic/angular';
import { CompanyService } from '../../../../providers/logged-in/company.service';
import { AwsService } from '../../../../providers/aws.service';
import { AuthService } from '../../../../providers/auth.service';
import {Company} from '../../../../models/company';

@Component({
  selector: 'app-company',
  templateUrl: './company.page.html',
  styleUrls: ['./company.page.scss'],
})
export class CompanyPage implements OnInit {

  public pageCount = 0;
  public currentPage = 1;
  public segment = 1;
  public companies: Company[];

  public loading = false;

  public filters: {
    name: string,
    status: any,
    approved_to_hire: any
  } = {
    name: null,
    status: 4,
    approved_to_hire: null
  };

  constructor(
      public platform: Platform,
      public companyService: CompanyService,
      public awsService: AwsService,
      private modalCtrl: ModalController,
      public authService: AuthService
  ) { }

  ngOnInit() {
    this.loadData(1); // reload all result
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

      this.pageCount = parseInt(response.headers.get('X-Pagination-Page-Count'), 10);
      this.currentPage = parseInt(response.headers.get('X-Pagination-Current-Page'), 10);

      this.companies = response.body;
      this.loading = false;

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

      this.pageCount = parseInt(response.headers.get('X-Pagination-Page-Count'), 10);
      this.currentPage = parseInt(response.headers.get('X-Pagination-Current-Page'), 10);

      const companies = response.body;
      this.companies = this.companies.concat(companies);
      this.loading = false;
      event.target.complete();
    }, () => {
    });
  }

  /**
   * close modal
   * @param data
   */
  dismiss(data = {}) {
    this.modalCtrl.getTop().then(overlay => {
      if (overlay)
        this.modalCtrl.dismiss(data);
    });
  }

  /**
   * on company selection
   * @param company
   */
  async rowSelected(company) {
    this.dismiss({
      company
    });
  }

  markLogoUnavailable(company) {
    company.logo_unavailable = true;
  }

  resetStatus() {
    this.filters = {
      name: this.filters.name,
      status: 4,
      approved_to_hire: null
    };

    this.loadData(1); // reload all result
  }

  resetFilter() {
    this.filters = {
      name: null,
      status: 4,
      approved_to_hire: null
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

    return urlParams;
  }

  searchByName($event) {
    this.filters.name = $event.detail.value;
    this.loadData(1); // reload all result
  }

  filterByStatus($event, status) {

    if (this.filters.status == status) {
      this.filters.status = null;
    } else {
      this.filters.status = status;
    }

    this.loadData(1); // reload all result
  }

  filterByApprovedToHire($event, status) {

    if (this.filters.approved_to_hire == status) {
      this.filters.approved_to_hire = null;
    } else {
      this.filters.approved_to_hire = status;
    }

    this.loadData(1); // reload all result
  }
}
