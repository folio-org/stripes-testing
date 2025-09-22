import uuid from 'uuid';
import ServicePoints from '../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../support/fragments/users/userEdit';
import BatchGroups from '../support/fragments/settings/invoices/batchGroups';

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
        .then(() => {
          return ensureFolioBatchGroupExists();
        });
    });
  });
});
