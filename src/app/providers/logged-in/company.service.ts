import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
// Services
import { AuthHttpService } from './authhttp.service';
// Models
import { Company } from '../../models/company';
import { File } from '../../models/file';


/**
 * Manages Company Functionality on the server
 */
@Injectable({
  providedIn: 'root'
})
export class CompanyService {

  private _companyEndpoint = '/companies';

  openLicence(companyId: number): Observable<Blob> {
    return this._authhttp.getPrivateBlob(this._companyEndpoint + '/commercial-licence/' + companyId);
  }

  constructor(private _authhttp: AuthHttpService) { }

  /**
   * List of all companies
   * @returns {Observable<any>}
   */
  list(page: number, searchParams: string, params: {} = {}): Observable<any> {
    const urlParams = params ? new URLSearchParams(params) : '';
    const url = `${this._companyEndpoint}?page=${page}${searchParams ? `&${searchParams}` : ''}&${urlParams.toString()}&expand=staff`;

    return this._authhttp.get(url, true);
  }

  /**
   * list company report
   * @returns {Observable<any>}
   */
  viewYearReport(company_id: number, year: number): Observable<any> {
    let url = `${this._companyEndpoint}/year-report?company_id=${company_id}`;

    if (year) {
      url += `&year=${year}`;
    }

    return this._authhttp.get(url);
  }

  /**
   * Create company
   * @param {Company} model
   * @returns {Observable<any>}
   */
  create(model: Company): Observable<any> {
    const postUrl = `${this._companyEndpoint}`;
    const params = {
      parent: model.parent_company_id,
      name: model.company_name,
      email: model.company_email,
      bonus_commission: model.company_bonus_commission,
      hourly_rate: model.company_hourly_rate,
      common_name_en: model.company_common_name_en,
      common_name_ar: model.company_common_name_ar,
      description_en: model.company_description_en,
      description_ar: model.company_description_ar,
      website: model.company_website,
      approved_to_hire: model.company_approved_to_hire,
      password: model.password
    };

    return this._authhttp.post(postUrl, params);
  }

  /**
   * Update company
   * @param {Company} model
   * @returns {Observable<any>}
   */
  update(model: Company): Observable<any> {
    const params = {
      parent: model.parent_company_id,
      name: model.company_name,
      email: model.company_email,
      bonus_commission: model.company_bonus_commission,
      hourly_rate: model.company_hourly_rate,
      common_name_en: model.company_common_name_en,
      common_name_ar: model.company_common_name_ar,
      description_en: model.company_description_en,
      description_ar: model.company_description_ar,
      website: model.company_website,
      approved_to_hire: model.company_approved_to_hire
    };

    return this._authhttp.patch(`${this._companyEndpoint}/${model.company_id}`, params);
  }

  /**
   * Deletes company
   * @param {Company} model
   * @returns {Observable<any>}
   */
  delete(model: Company): Observable<any> {
    return this._authhttp.delete(`${this._companyEndpoint}/${model.company_id}`);
  }

  /**
   * View company detail
   * @param string company_id
   * @returns {Observable<any>}
   */
  view(company_id: string): Observable<any> {
    // const url = `${this._companyEndpoint}/${company_id}?expand=subCompanies,stores,files,brands,requests,notes,notes.createdBy,parentTransfers,parentTransfers.childTransfers,parentTransfers.childTransfers.company`;
    const url = `${this._companyEndpoint}/${company_id}?expand=staff,subCompanies,stores,files,brands,requests,parentTransfers,parentTransfers.childTransfers,parentTransfers.childTransfers.company`;
    return this._authhttp.get(url);
  }

  /**
   * Reset Password
   * @param {Company} model
   * @returns {Observable<any>}
   */
  resetPassword(model: Company): Observable<any> {
    const url = `${this._companyEndpoint}/reset-password/${model.company_id}`;
    return this._authhttp.patch(url, {});
  }

  /**
   * create file for company
   * @param {Company} model
   * @returns {Observable<any>}
   */
  createFile(model: File): Observable<any> {
    const url = `${this._companyEndpoint}/file-create/${model.company_id}`;
    const params = {
      file_title: model.file_title,
      file_description: model.file_description,
      file_s3_path: model.file_s3_path,
    };
    return this._authhttp.post(url, params);
  }

  /**
   * update follow up
   * @param model
   */
  updateFollowup(model: Company): Observable<any> {
    const url = `${this._companyEndpoint}/update-followup/${model.company_id}`;
    const params = {
      followup: model.company_followup
    };
    return this._authhttp.patch(url, params);
  }

  /**
   * update follow up interval in weeks
   * @param company_id
   * @param company_followup_interval_weeks
   */
  updateFollowupInterval(company_id, company_followup_interval_weeks): Observable<any> {
    const url = `${this._companyEndpoint}/update-followup-interval/${company_id}`;
    const params = {
      followup_interval_weeks: company_followup_interval_weeks
    };
    return this._authhttp.patch(url, params);
  }

  /**
   * create file for company
   * @param {Company} model
   * @returns {Observable<any>}
   */
  updateFile(model: File): Observable<any> {
    const url = `${this._companyEndpoint}/file-update/${model.file_uuid}`;
    const params = {
      file_title: model.file_title,
      file_description: model.file_description
    };

    return this._authhttp.patch(url, params);
  }

  /**
   * Deletes company
   * @param {Company} model
   * @returns {Observable<any>}
   */
  deleteDoc(model: File): Observable<any> {
    const url = `${this._companyEndpoint}/remove-file/${model.file_uuid}`;
    return this._authhttp.delete(url);
  }

  /**
   * Deletes company
   * @param {Company} model
   * @returns {Observable<any>}
   */
  downloadExcel(param: any): Observable<any> {
    const url = `${this._companyEndpoint}/download-list-excel?download=1${param}`;
    return this._authhttp.excelget(url, `company-list.xlsx`);
  }

  /**
   * Deletes company
   * @param {Company} model
   * @returns {Observable<any>}
   */
  downloadCandidatesExcel(company_id: number, param: string = ""): Observable<any> {
    const url = `${this._companyEndpoint}/download-candidates-excel/${company_id}?download=1${param}`;
    return this._authhttp.excelget(url, `company-candidate-list.xlsx`);
  }

  /**
   * change company status
   * @param model
   * @param status
   */
  changeStatus(model: Company, status: number = 10): Observable<any> {
    const url = `${this._companyEndpoint}/change-status/${model.company_id}`;
    return this._authhttp.patch(url, { status });
  }

  /**
   * @param model
   * @param staff_id
   * @returns
   */
  updateStaff(model: Company, staff_id: null): Observable<any> {
    const url = `${this._companyEndpoint}/update-staff/${model.company_id}`;
    return this._authhttp.patch(url, { staff_id });
  }

  /**
   * get login url and open in new window
   * @param company_id
   * @returns
   */
  login(company_id): Observable<any>{
    let url = `${this._companyEndpoint}/login/${company_id}`;
    return this._authhttp.post(url, {});
  }
}
