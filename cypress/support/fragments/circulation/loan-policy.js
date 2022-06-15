import uuid from 'uuid';
import { getTestEntityValue } from '../../utils/stringTools';
import { LIBRARY_DUE_DATE_MANAGMENT, LOAN_PROFILE } from '../../constants';

const getDefaultLoanPolicy = (limit, scheduleId) => {
  const defaultLoanPolicy = {
    id: uuid(),
    name: getTestEntityValue(),
    loanable: true,
    loansPolicy: {
      profileId: 'Rolling',
      period: { duration: 1, intervalId: 'Days' },
      itemLimit: limit,
      closedLibraryDueDateManagementId:'CURRENT_DUE_DATE',
      fixedDueDateScheduleId: scheduleId
    },
    renewable: false,
  };
  return defaultLoanPolicy;
};

export const defaultLoanPolicy = {
  id: uuid(),
  name: getTestEntityValue(),
  description: 'description',
  loanable: false,
  renewable: false,
};

export default {
  getDefaultLoanPolicy,
  createApi(loanPolicy) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'loan-policy-storage/loan-policies',
        body: loanPolicy,
      })
      .then(({ body }) => {
        Cypress.env('loanPolicy', body);
        return body;
      });
  },
  deleteApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `loan-policy-storage/loan-policies/${id}`,
    });
  },
  getApi(searchParams) {
    return cy.okapiRequest({
      path: 'loan-policy-storage/loan-policies',
      query: searchParams,
    });
  },
  createLoanableNotRenewableLoanPolicyApi(loanPolicy) {
    cy.createLoanPolicy({
      name: loanPolicy.name,
      id: loanPolicy.id,
      loanable: true,
      loansPolicy: {
        closedLibraryDueDateManagementId: LIBRARY_DUE_DATE_MANAGMENT.CURRENT_DUE_DATE,
        period: {
          duration: 3,
          intervalId: 'Weeks',
        },
        profileId: LOAN_PROFILE.ROLLING,
      },
      renewable: false,
      renewalsPolicy: {
        unlimited: true,
      },
    });
  },
};
