import LoanPolicy from '../../support/fragments/circulation/loan-policy';
import LostItemFeePolicy from '../../support/fragments/circulation/lost-item-fee-policy';

describe('Fee/fine management', () => {
  const OneMinuteLoanPolicy = {
    loanable: true,
    renewable: true,
    name: 'Loan-1-min_000',
    loansPolicy: {
      profileId: 'Rolling',
      period: {
        duration: 1,
        intervalId: 'Minutes'
      },
      closedLibraryDueDateManagementId: 'CURRENT_DUE_DATE_TIME'
    },
    renewalsPolicy: {
      numberAllowed: 2,
      renewFromId: 'SYSTEM_DATE'
    }
  };

  const feePolicyPlusProcFee = {
    chargeAmountItem: {
      chargeType: 'anotherCost',
      amount: 100.00
    },
    lostItemProcessingFee: 25.00,
    chargeAmountItemPatron: true,
    chargeAmountItemSystem: false,
    returnedLostItemProcessingFee: true,
    replacedLostItemProcessingFee: false,
    replacementProcessingFee: 0.00,
    replacementAllowed: false,
    lostItemReturned: 'Charge',
    name: 'DL-set-cost-plus-proc-fee_000',
    lostItemChargeFeeFine: {
      duration: 6,
      intervalId: 'Weeks'
    },
    feesFinesShallRefunded: {
      intervalId: 'Months',
      duration: 6
    }
  };

  const feePolicyNoProcFee = {
    chargeAmountItem: {
      chargeType: 'anotherCost',
      amount: 100.00
    },
    lostItemProcessingFee: 0.00,
    chargeAmountItemPatron: false,
    chargeAmountItemSystem: false,
    returnedLostItemProcessingFee: true,
    replacedLostItemProcessingFee: false,
    replacementProcessingFee: 0.00,
    replacementAllowed: false,
    lostItemReturned: 'Charge',
    name: 'DL-set-cost-no-proc-fee_000',
    lostItemChargeFeeFine: {
      duration: 6,
      intervalId: 'Weeks'
    },
    feesFinesShallRefunded: {
      intervalId: 'Months',
      duration: 6
    }
  };

  const feePolicyNoSetCost = {
    chargeAmountItem: {
      chargeType: 'anotherCost',
      amount: 0.00
    },
    lostItemProcessingFee: 25.00,
    chargeAmountItemPatron: true,
    chargeAmountItemSystem: false,
    returnedLostItemProcessingFee: true,
    replacedLostItemProcessingFee: false,
    replacementProcessingFee: 0.00,
    replacementAllowed: false,
    lostItemReturned: 'Charge',
    name: 'DL-proc-fee-no-set-cost_000',
    lostItemChargeFeeFine: {
      duration: 6,
      intervalId: 'Weeks'
    },
    feesFinesShallRefunded: {
      intervalId: 'Months',
      duration: 6
    }
  };

  before('Preconditions', () => {
    cy.getAdminToken();

    // creating New Loan policy
    // LoanPolicy.createApi(OneMinuteLoanPolicy).then((res) => {
    //   OneMinuteLoanPolicy.props = res;
    // });

    // creating New Lost item fee policy 1
    LostItemFeePolicy.createApiSpecific(feePolicyPlusProcFee).then((res) => {
      feePolicyPlusProcFee.props = res;
    });

    // creating New Lost item fee policy 2
    LostItemFeePolicy.createApiSpecific(feePolicyNoProcFee).then((res) => {
      feePolicyNoProcFee.props = res;
    });

    // creating New Lost item fee policy 3
    LostItemFeePolicy.createApiSpecific(feePolicyNoSetCost).then((res) => {
      feePolicyNoSetCost.props = res;
    });

    // settings FEE/FINE SETTINGS FOR DECLARED LOST TESTING
    // creating CIRCULATION RULES FOR DECLARED LOST TESTING
  });

  it('C11031 Verify "set cost" lost item fee and lost item processing fee refunded properly when item with status "Declared lost" returned', () => {
    // cy.log(OneMinuteLoanPolicy.props);
    cy.log(feePolicyPlusProcFee.props);
    cy.log(feePolicyNoProcFee.props);
    cy.log(feePolicyNoSetCost.props);
  });
  after('Deleting created entities', () => {
    // deleting loan policy
    // LoanPolicy.deleteApi(OneMinuteLoanPolicy.props.id);

    // deleting created New Lost item fee policy 1
    LostItemFeePolicy.deleteApi(feePolicyPlusProcFee.props.id);

    // deleting created New Lost item fee policy 2
    LostItemFeePolicy.deleteApi(feePolicyNoProcFee.props.id);

    // deleting created New Lost item fee policy 3
    LostItemFeePolicy.deleteApi(feePolicyNoSetCost.props.id);

    // returning settings FEE/FINE SETTINGS FOR DECLARED LOST TESTING
    // deleting created CIRCULATION RULES FOR DECLARED LOST TESTING
  });
});
