import { Component, OnInit } from '@angular/core';
import {ModalController, AlertController, ToastController, Platform} from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
// services
import { StaffService } from 'src/app/providers/logged-in/staff.service';
// models
import { Staff } from 'src/app/models/staff';
import {Request, Story} from 'src/app/models/request';
import { Note } from 'src/app/models/note';
import { DailyStandupAnswer } from 'src/app/models/daily-standup-answer';
// pages
import { StaffFormPage } from '../staff-form/staff-form.page';
import {AuthService} from '../../../../providers/auth.service';
import {CandidateWorkHistoryService} from '../../../../providers/logged-in/candidate-work-history.service';
import {CandidateWorkHistory} from '../../../../models/candidate-work-history';
import {RequestService} from '../../../../providers/logged-in/request.service';
import {NoteService} from '../../../../providers/logged-in/note.service';
import { StaffSalaryFormPage } from '../staff-salary-form/staff-salary-form.page';
import { StaffSalary } from 'src/app/models/staff_salary';
import {StoryService} from "../../../../providers/logged-in/story.service";
import {AwsService} from "../../../../providers/aws.service";
import { resolvedStoredImageUrl } from '../../../../providers/stored-image-url';
import {InvitationService} from "../../../../providers/logged-in/invitation.service";
import {PermissionService} from "../../../../providers/logged-in/permission.service";
import { DailyStandupQuestionService } from 'src/app/providers/logged-in/daily-standup-question.service';


@Component({
  selector: 'app-staff-view',
  templateUrl: './staff-view.page.html',
  styleUrls: ['./staff-view.page.scss'],
})
export class StaffViewPage implements OnInit {

  public staff: Staff;

  public daily_standup_answers: DailyStandupAnswer[] = [];

  public staff_id;
  public start_date = null;
  public end_date = null;
  public pageCount;
  public currentPage;
  public totalCount = 0;

  currentPageStandup
  pageCountStandup
  loadStandup

  public RPageCount;
  public RCurrentPage;

  public SPageCount;
  public SCurrentPage;

  public STPageCount;
  public STCurrentPage;

  public NPageCount;
  public NCurrentPage;

  public IPageCount;
  public ICurrentPage;

  public CPageCount;
  public CCurrentPage;

  public notes: Note[];
  public requests: Request[];
  public stories: Story[];
  public salaries = [];
  public invitations = [];
  public companies = [];

  public candidateWorkHistory: CandidateWorkHistory[];
  public loadCandidateWorkHistory = false;
  public loading = false;
  public CLoading = false;
  public RLoading = false;
  public NLoading = false;
  public SLoading = false;
  public STLoading = false;
  public ILoading = false;

  public segment = 'info';
  public statusChanging = null;
  public deleting = null;

  public sendingNewPassword = false;

  public loadingLoginUrl: boolean = false; 

  constructor(
    public router: Router,
    public aws: AwsService,
    public activateRoute: ActivatedRoute,
    private _modalCtrl: ModalController,
    private _alertCtrl: AlertController,
    private _toastCtrl: ToastController,
    public staffService: StaffService,
    public permissionService: PermissionService,
    public authService: AuthService,
    public workHistoryService: CandidateWorkHistoryService,
    public platform: Platform,
    public requestService: RequestService,
    public noteService: NoteService,
    public invitationService: InvitationService,
    public storyService: StoryService,
    public standupService: DailyStandupQuestionService
  ) { }

  ngOnInit() {
    window.analytics.page('Staff View Page');

    // Load the passed model if available
    if (window.history.state) {
      this.staff = window.history.state.model;
    }

    this.staff_id = this.activateRoute.snapshot.paramMap.get('staff_id');
    this.start_date = this.activateRoute.snapshot.paramMap.get('start_date');
    this.end_date = this.activateRoute.snapshot.paramMap.get('end_date');

    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.staffService.view(this.staff_id).subscribe(staff => {
      this.staff = staff;
      this.loading = false;
    }, () => {
      this.loading = false;
    });
  }

  /**
   * show popup to add salary
   */
  async addSalary() {
    window.history.pushState({ navigationId: window.history.state.navigationId }, null, window.location.pathname);

    const modal = await this._modalCtrl.create({
      component: StaffSalaryFormPage,
      componentProps: {
        model: new StaffSalary(),
        staff_id: this.staff_id
      }
    });
    modal.onDidDismiss().then(e => {

      if (!e.data || e.data.from != 'native-back-btn') {
        window['history-back-from'] = 'onDidDismiss';
        window.history.back();
      }

      if (e && e.data && e.data.refresh) {
        this.loadSalaries(1, true);
      }
    });
    modal.present();
  }

  /**
   * Loads Form in modal to update
   */
  async update() {
    window.history.pushState({ navigationId: window.history.state.navigationId }, null, window.location.pathname);

    const modal = await this._modalCtrl.create({
      component: StaffFormPage,
      componentProps: {
        model: this.staff,
        staff_id: this.staff.staff_id
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
   * Confirm password reset and send new password
   */
  async resetPassword() {

    const confirm = await this._alertCtrl.create({
      header: 'Enter New Password',
      inputs: [
        {
          name: 'password',
          type: 'text',
          placeholder: 'Please enter password'
        },
      ],
      buttons: [
        {
          text: 'Send',
          handler: (data) => {
            if (data && data.password.trim()) {
              this.staff.staff_password_hash = data.password;
              this.sendNewPassword();
            } else {
              this._toastCtrl.create({
                message: 'Please enter password',
                duration: 3000
              }).then(toast => toast.present());
            }
          }
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });
    confirm.present();
  }

  /**
   * Reset and email the staff a new password
   */
  async sendNewPassword() {

    this.sendingNewPassword = true;

    this.staffService.resetPassword(this.staff).subscribe(async response => {
      this.sendingNewPassword = false;

      if (response.operation == 'error') {
        const toast = await this._toastCtrl.create({
          message: response.message,
          duration: 3000
        });
        toast.present();
      } else {
        const alert = await this._alertCtrl.create({
            header: 'Reset Password',
            subHeader: 'New password sent to staff',
            buttons: ['Okay']
          });
        alert.present();
      }
    }, () => {
      this.sendingNewPassword = false;
    });
  }

  segmentChanged(event) {
    this.segment = event.detail.value;

    if (this.segment == 'assign_candidate') {
        this.loadAssignedCandidateData(1);
    }

    if (this.segment == 'request') {
        this.loadRequest(1);
    }

    if (this.segment == 'note') {
        this.loadNotes(1);
    }

    if (this.segment == 'salaries') {
        this.loadSalaries(1);
    }

    if (this.segment == 'stories') {
        this.loadStories(1);
    }

    if (this.segment == 'suggestions') {
        this.loadSuggestions(1, false);
    }

    if (this.segment == 'invitations') {
        this.loadInvitation(1, false);
    }

    if (this.segment == 'stand-up') {
        this.loadStandupData();
    }
    if (this.segment == 'companies') {
        this.loadCompanies(1);
    }
  }

  /**
   * load company data
   * @param page
   * @param silent
   */
  async loadAssignedCandidateData(page: number, silent = false) {

    if (!silent) {
      this.loadCandidateWorkHistory = true;
    }

    const params = '&expand=candidate,store,company,parentCompany' + this.urlParams();

    this.workHistoryService.list(page, params).subscribe(response => {

      this.pageCount = parseInt(response.headers.get('X-Pagination-Page-Count'), 10);
      this.currentPage = parseInt(response.headers.get('X-Pagination-Current-Page'), 10);
      this.totalCount = parseInt(response.headers.get('X-Pagination-Total-Count'), 10);

      this.candidateWorkHistory = response.body;
      this.loadCandidateWorkHistory = false;

    }, () => {
      this.loadCandidateWorkHistory = false;
    });
  }

  /**
   * load more companies on scroll to bottom
   * @param event
   */
  doInfiniteAssignedCandidateData(event) {

    this.currentPage++;

    this.loadCandidateWorkHistory = true;
    const params = '&expand=candidate,store,company,parentCompany=' + this.urlParams();
    this.workHistoryService.list(this.currentPage, params).subscribe(response => {

      this.pageCount = parseInt(response.headers.get('X-Pagination-Page-Count'), 10);
      this.currentPage = parseInt(response.headers.get('X-Pagination-Current-Page'), 10);
      this.totalCount = parseInt(response.headers.get('X-Pagination-Total-Count'), 10);

      const companies = response.body;
      this.candidateWorkHistory = this.candidateWorkHistory.concat(companies);
      this.loadCandidateWorkHistory = false;
      event.target.complete();
    }, () => {
    });
  }

  loadStandupData() {

    this.loadStandup = true;
    let param = `&staff_id=${this.staff_id}`;
    this.standupService.listAnswers(1, param).subscribe(response => {

      this.loadStandup = false;

      this.pageCountStandup = parseInt(response.headers.get('X-Pagination-Page-Count'), 10);
      this.currentPageStandup = parseInt(response.headers.get('X-Pagination-Current-Page'), 10);
     // this.totalCountStandup = parseInt(response.headers.get('X-Pagination-Total-Count'), 10);

      this.daily_standup_answers = response.body;
    });
  }

  doInfiniteStandup(event) {

    if(this.currentPageStandup == this.pageCountStandup) {
      return event.target.complete();
    }

    this.currentPageStandup++;

    this.loadStandup = true;
    let param = `&staff_id=${this.staff_id}`;
    this.standupService.listAnswers(this.currentPageStandup, param).subscribe(response => {

      this.loadStandup = false;

      this.pageCountStandup = parseInt(response.headers.get('X-Pagination-Page-Count'), 10);
      this.currentPageStandup = parseInt(response.headers.get('X-Pagination-Current-Page'), 10);
      //this.totalCountStandup = parseInt(response.headers.get('X-Pagination-Total-Count'), 10);

      this.daily_standup_answers = this.daily_standup_answers.concat(response.body);

      event.target.complete();
    });
  }

  /**
   * load salaries
   * @param page
   * @param silent
   */
  async loadSalaries(page: number, silent = false) {

    if (!silent) {
      this.SLoading = true;
    }

    this.staffService.listSalaries(this.staff_id, page).subscribe(response => {

      this.SPageCount = parseInt(response.headers.get('X-Pagination-Page-Count'), 10);
      this.SCurrentPage = parseInt(response.headers.get('X-Pagination-Current-Page'), 10);

      this.salaries = response.body;

      this.SLoading = false;

    }, () => {
      this.SLoading = false;
    });
  }

  /**
   * load more salary data on scroll to bottom
   * @param event
   */
  doInfiniteSalary(event) {

    this.SCurrentPage++;

    this.SLoading = true;

    this.staffService.listSalaries(this.staff_id, this.SCurrentPage).subscribe(response => {

      this.SPageCount = parseInt(response.headers.get('X-Pagination-Page-Count'), 10);
      this.SCurrentPage = parseInt(response.headers.get('X-Pagination-Current-Page'), 10);

      this.salaries = this.salaries.concat(response.body);

      this.SLoading = false;

      event.target.complete();
    }, () => {
    });
  }

  /**
   *
   * @param page
   * @param silent
   */
  async loadRequest(page: number, silent = false) {

    if (!silent) {
      this.RLoading = true;
    }
    const params = this.urlParams() + '&expand=company,staffs,staff';
    this.requestService.list(page, params).subscribe(response => {

      this.RPageCount = parseInt(response.headers.get('X-Pagination-Page-Count'), 10);
      this.RCurrentPage = parseInt(response.headers.get('X-Pagination-Current-Page'), 10);

      this.requests = response.body;
      this.RLoading = false;

    }, () => {
      this.RLoading = false;
    });
  }

  doInfiniteRequest(event) {

    this.RCurrentPage++;

    this.RLoading = true;
    const params = this.urlParams() + '&expand=company,staffs,staff';
    this.requestService.list(this.RCurrentPage, params).subscribe(response => {

      this.RPageCount = parseInt(response.headers.get('X-Pagination-Page-Count'), 10);
      this.RCurrentPage = parseInt(response.headers.get('X-Pagination-Current-Page'), 10);

      const companies = response.body;
      this.requests = this.requests.concat(companies);
      this.RLoading = false;
      event.target.complete();
    }, () => {
    });
  }


  /**
   *
   * @param page
   * @param silent
   */
  async loadStories(page: number, silent = false) {

    if (!silent) {
      this.STLoading = true;
    }
    const params =  this.urlParams() + '&expand=request,request.company,staff';
    this.storyService.list(page, params).subscribe(response => {

      this.STPageCount = parseInt(response.headers.get('X-Pagination-Page-Count'), 10);
      this.STCurrentPage = parseInt(response.headers.get('X-Pagination-Current-Page'), 10);

      this.stories = response.body;
      this.STLoading = false;

    }, () => {
      this.STLoading = false;
    });
  }

  doInfiniteStories(event) {

    this.STCurrentPage++;

    this.STLoading = true;
    const params =  this.urlParams() + '&expand=request,request.company,staff';
    this.storyService.list(this.STCurrentPage, params).subscribe(response => {

      this.STPageCount = parseInt(response.headers.get('X-Pagination-Page-Count'), 10);
      this.STCurrentPage = parseInt(response.headers.get('X-Pagination-Current-Page'), 10);

      this.stories = this.stories.concat(response.body);
      this.STLoading = false;
      event.target.complete();
    }, () => {
    });
  }

  /**
   *
   * @param page
   * @param silent
   */
  async loadNotes(page: number, silent = false) {

    if (!silent) {
      this.NLoading = true;
    }
    let params = this.urlParams();
    let expand = '&expand=companyContact,request,company,createdBy,updatedBy';

    this.noteService.list(params, page, expand).subscribe(response => {

      this.NPageCount = parseInt(response.headers.get('X-Pagination-Page-Count'), 10);
      this.NCurrentPage = parseInt(response.headers.get('X-Pagination-Current-Page'), 10);

      this.notes = response.body;
      this.NLoading = false;

    }, () => {
      this.NLoading = false;
    });
  }

  doInfiniteNotes(event) {

    this.NCurrentPage++;

    this.NLoading = true;
    let params = this.urlParams();
    let expand = '&expand=companyContact,request,company,createdBy,updatedBy';

    this.noteService.list(params, this.NCurrentPage,expand).subscribe(response => {

      this.NPageCount = parseInt(response.headers.get('X-Pagination-Page-Count'), 10);
      this.NCurrentPage = parseInt(response.headers.get('X-Pagination-Current-Page'), 10);

      const companies = response.body;
      this.notes = this.notes.concat(companies);
      this.NLoading = false;
      event.target.complete();
    }, () => {
    });
  }

  /**
   *
   * @param page
   * @param silent
   */
  async loadSuggestions(page: number, silent = false) {

    if (!silent) {
      this.NLoading = true;
    }
    let params = this.urlParams();
    const expand = '&expand=company,staffs,staff,suggestion,candidate,fulltimer&type=Suggested';

    this.noteService.list(params, page, expand).subscribe(response => {

      this.NPageCount = parseInt(response.headers.get('X-Pagination-Page-Count'), 10);
      this.NCurrentPage = parseInt(response.headers.get('X-Pagination-Current-Page'), 10);

      this.notes = response.body;
      this.NLoading = false;

    }, () => {
      this.NLoading = false;
    });
  }

  doInfiniteSuggestions(event) {

    this.NCurrentPage++;

    this.NLoading = true;
    let params = this.urlParams();
    let expand = '&expand=request,company,staffs,staff,suggestion,candidate,fulltimer&type=Suggested';
    this.noteService.list(params, this.NCurrentPage,expand).subscribe(response => {

      this.NPageCount = parseInt(response.headers.get('X-Pagination-Page-Count'), 10);
      this.NCurrentPage = parseInt(response.headers.get('X-Pagination-Current-Page'), 10);

      const companies = response.body;
      this.notes = this.notes.concat(companies);
      this.NLoading = false;
      event.target.complete();
    }, () => {
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

  getStatus(status) {
    let response;
    switch (status) {
      case 0:
        response = 'Unstarted';
        break;
      case 1:
        response = 'Started';
        break;
      case 2:
        response = 'Finished';
        break;
      case 3:
        response = 'Delivered';
        break;
      case 4:
        response = 'Rejected';
        break;
      case 5:
        response = 'Accepted';
        break;
      case 6:
        response = 'Cancelled';
        break;
      default:
        response = 'Invalid';
        break;
    }
    return response;
  }

  async changeStatus() {
    const confirm = await this._alertCtrl.create({
      header: 'Do you want to change status?',
      buttons: [
        {
          text: 'Yes',
          handler: (data) => {
            this.statusChange();
          }
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });
    confirm.present();
  }

  statusChange() {
    let status = (this.staff.staff_status == '10') ? 0 : 10;
    this.statusChanging = true;
    this.staffService.changeStatus(this.staff, status).subscribe(response => {
      this.statusChanging = false;

      if (response.operation == 'success') {
        this.loadData();
      }
      this._toastCtrl.create({
        message: this.authService.errorMessage(response.message),
        duration: 2000
      }).then(toast => toast.present());
    }, () => {
      this.statusChanging = false;
    });
  }

  async recover() {
    const confirm = await this._alertCtrl.create({
      header: 'Do you want to recover this account?',
      buttons: [
        {
          text: 'Yes',
          handler: (data) => {
            this.recoverAccount();
          }
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });
    confirm.present();
  }

  recoverAccount() {
    this.deleting = true;
    this.staffService.recoverAccount(this.staff).subscribe(response => {
      this.deleting = false;

      if (response.operation == 'success') {
        this.loadData();
      }
      this._toastCtrl.create({
        message: this.authService.errorMessage(response.message),
        duration: 2000
      }).then(toast => toast.present());
    }, () => {
      this.deleting = false;
    });
  }

  rowSelected(model) {

    this.router.navigate(['/candidate-view', model.candidate_id], {
      state: {
        model
      }
    });
  }

  /**
   * @param $event
   * @param candidate
   */
  loadLogo($event, candidate) {
    candidate.candidate_personal_photo = null;
  }

  logoSrc(company): string | null {
    return resolvedStoredImageUrl(company?.company_logo_url, company?.company_logo, this.aws.cloudinaryUrl);
  }

  showLogo(company): boolean {
    const src = this.logoSrc(company);
    return !!src && company?.logo_failed_src !== src;
  }

  markLogoUnavailable(company) {
    company.logo_failed_src = this.logoSrc(company);
  }


  /**
   *
   * @param page
   * @param silent
   */
  async loadInvitation(page: number, silent = false) {

    if (!silent) {
      this.ILoading = true;
    }
    let params = this.urlParams() + '&expand=candidate';

    this.invitationService.list(page, params).subscribe(response => {

      this.IPageCount = parseInt(response.headers.get('X-Pagination-Page-Count'), 10);
      this.ICurrentPage = parseInt(response.headers.get('X-Pagination-Current-Page'), 10);

      this.invitations = response.body;
      this.ILoading = false;

    }, () => {
      this.ILoading = false;
    });
  }

  doInfiniteInvitation(event) {

    this.ICurrentPage++;

    this.ILoading = true;
    let params = this.urlParams() + '&expand=candidate';

    this.invitationService.list(this.ICurrentPage, params).subscribe(response => {

      this.IPageCount = parseInt(response.headers.get('X-Pagination-Page-Count'), 10);
      this.ICurrentPage = parseInt(response.headers.get('X-Pagination-Current-Page'), 10);

      this.invitations = this.invitations.concat(response.body);
      this.ILoading = false;
      event.target.complete();
    }, () => {
    });
  }
  /**
   *
   * @param page
   * @param silent
   */
  async loadCompanies(page: number, silent = false) {

    if (!silent) {
      this.CLoading = true;
    }
    let params = this.urlParams() + '&expand=candidate';

    this.staffService.listCompanies(this.staff_id, page, params).subscribe(response => {

      this.CPageCount = parseInt(response.headers.get('X-Pagination-Page-Count'), 10);
      this.CCurrentPage = parseInt(response.headers.get('X-Pagination-Current-Page'), 10);

      this.companies = response.body;
      this.CLoading = false;

    }, () => {
      this.CLoading = false;
    });
  }

  doInfiniteCompanies(event) {

    this.CCurrentPage++;

    this.CLoading = true;
    let params = this.urlParams() + '&expand=candidate';

    this.staffService.listCompanies(this.staff_id, this.CCurrentPage, params).subscribe(response => {

      this.CPageCount = parseInt(response.headers.get('X-Pagination-Page-Count'), 10);
      this.ICurrentPage = parseInt(response.headers.get('X-Pagination-Current-Page'), 10);

      this.companies = this.companies.concat(response.body);
      this.CLoading = false;
      event.target.complete();
    }, () => {
    });
  }

  urlParams() {
    let urlParams = '';

    urlParams += '&staff_id=' + this.staff_id;
    if (this.start_date && this.start_date != 1) {
      urlParams += '&start_date=' + this.start_date;
    }
    if (this.end_date && this.end_date != 1) {
      urlParams += '&end_date=' + this.end_date;
    }

    return urlParams;
  }

  login() {
    this.loadingLoginUrl = true; 

    this.staffService.login(this.staff_id).subscribe(async res => {

      this.loadingLoginUrl = false;
       
      if(res.operation == "error") {
        const alert = await this._alertCtrl.create({
          header: 'Oops',
          subHeader: this.authService.errorMessage(res.message),
          buttons: ['Okay']
        });
        alert.present();
      } else {
        window.open(res.redirect, "_blank");
      }
    });
  }
}
