import uuid from 'uuid';
import ServicePoints from '../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../support/fragments/users/userEdit';
import BatchGroups from '../support/fragments/settings/invoices/batchGroups';
import ExpenseClasses from '../support/fragments/settings/finance/expenseClasses';

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
          ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
            servicePointIds.push(servicePoint.id);
            defaultServicePointId = servicePoint.id;
          });
          ServicePoints.getCircDesk2ServicePointViaApi().then((servicePoint) => {
            servicePointIds.push(servicePoint.id);
          });
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
        .then(() => ensureElectronicAndPrintExpenseClasses());
    });
  });
});
