import uuid from 'uuid';
import Budgets from '../support/fragments/finance/budgets/budgets';
import FiscalYears from '../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../support/fragments/finance/funds/funds';
import ExpenseClasses from '../support/fragments/settings/finance/expenseClasses';
import BatchGroups from '../support/fragments/settings/invoices/batchGroups';
import ServicePoints from '../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../support/fragments/users/userEdit';

describe('Prepare test data', () => {
  const ensureFolioBatchGroupExists = () => {
    return BatchGroups.getBatchGroupsViaApi({ query: 'name=="FOLIO"', limit: 1 }).then((groups) => {
      if (groups?.[0]) return groups[0];
      return BatchGroups.getBatchGroupsViaApi({
        query: 'cql.allRecords=1 sortby name',
        limit: 2000,
      }).then((all) => {
        const existing = (all || []).find((g) => String(g.name).trim().toLowerCase() === 'folio');
        if (existing) return existing;
        const payload = { id: uuid(), name: 'FOLIO', description: 'FOLIO' };
        return BatchGroups.createBatchGroupViaApi(payload);
      });
    });
  };

  const ensureElectronicAndPrintExpenseClasses = () => {
    return ExpenseClasses.getExpenseClassesViaApi({
      query: 'cql.allRecords=1 sortby name',
      limit: 2000,
      totalRecords: 'none',
    }).then((list = []) => {
      const names = new Set(
        list.map((x) => String(x.name || '')
          .trim()
          .toLowerCase()),
      );
      const steps = [];

      if (!names.has('electronic')) {
        const ec = ExpenseClasses.getDefaultExpenseClass();
        ec.name = 'Electronic';
        ec.code = 'Elec';
        steps.push(() => ExpenseClasses.createExpenseClassViaApi(ec));
      }

      if (!names.has('print')) {
        const pc = ExpenseClasses.getDefaultExpenseClass();
        pc.name = 'Print';
        pc.code = 'Prn';
        steps.push(() => ExpenseClasses.createExpenseClassViaApi(pc));
      }
      return steps.reduce((p, fn) => p.then(fn), cy.wrap(null));
    });
  };

  const ensureBudgetsExist = () => {
    const fundCodes = [
      'HIST',
      'LATAMHIST',
      'ASIAHIST',
      'MISCHIST',
      'GIFTS-ONE-TIME',
      'EUROHIST',
      'AFRICAHIST',
    ];

    return cy.wrap(null).then(() => {
      const budgetPromises = fundCodes.map((code) => {
        return FiscalYears.getViaApi({ query: 'code="FY2026"' }).then((resp) => {
          if (!resp.fiscalYears?.[0]) {
            throw new Error('FY2026 fiscal year not found');
          }

          return Funds.getFundsViaApi({ query: `code="${code}"` }).then((body) => {
            if (!body.funds?.[0]) {
              cy.log(`Fund with code "${code}" not found, skipping budget creation`);
              return null;
            }

            const budget = {
              ...Budgets.getDefaultBudget(),
              allocated: 1000,
              fiscalYearId: resp.fiscalYears[0].id,
              fundId: body.funds[0].id,
            };

            return Budgets.createViaApi(budget);
          });
        });
      });

      return Promise.all(budgetPromises);
    });
  };

  const addElectronicExpenseClassToBudget = () => {
    return ExpenseClasses.getExpenseClassesViaApi({ query: 'name="Electronic"' }).then(
      (ecList = []) => {
        const expenseClassResp = ecList.find((ec) => ec.name === 'Electronic');

        if (!expenseClassResp) {
          cy.log('Electronic expense class not found, skipping budget update');
          return null;
        }

        return Budgets.getBudgetViaApi({ query: 'code=EUROHIST' }).then(({ budgetResp }) => {
          if (!budgetResp) {
            cy.log('EUROHIST budget not found, skipping expense class assignment');
            return null;
          }

          return Budgets.updateBudgetViaApi({
            ...budgetResp,
            statusExpenseClasses: [
              {
                status: 'Active',
                expenseClassId: expenseClassResp.id,
              },
            ],
          });
        });
      },
    );
  };

  it('001 Assign service points to admin user', { tags: ['prepareTestData', 'smoke'] }, () => {
    const servicePointIds = [];
    let defaultServicePointId;
    let userId;
    cy.getAdminToken().then(() => {
      cy.getAdminUserId()
        .then((id) => {
          userId = id;
        })
        .then(() => {
          // Get or create Circ Desk 1 service point
          ServicePoints.getOrCreateCircDesk1ServicePointViaApi().then((servicePoint) => {
            servicePointIds.push(servicePoint.id);
            defaultServicePointId = servicePoint.id;
          });
          // Get or create Circ Desk 2 service point
          ServicePoints.getOrCreateCircDesk2ServicePointViaApi().then((servicePoint) => {
            servicePointIds.push(servicePoint.id);
          });
          // Get Online service point (assuming it exists or should be created elsewhere)
          ServicePoints.getOnlineServicePointViaApi().then((servicePoint) => {
            servicePointIds.push(servicePoint.id);
          });
        })
        .then(() => {
          UserEdit.changeServicePointPreferenceViaApi(
            userId,
            servicePointIds,
            defaultServicePointId,
          );
        })
        .then(() => ensureFolioBatchGroupExists())
        .then(() => ensureElectronicAndPrintExpenseClasses())
        .then(() => ensureBudgetsExist())
        .then(() => addElectronicExpenseClassToBudget());
    });
  });
});
