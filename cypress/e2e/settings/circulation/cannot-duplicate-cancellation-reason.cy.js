import uuid from 'uuid';
import Permissions from '../../../support/dictionary/permissions';
import CancellationReason from '../../../support/fragments/settings/circulation/cancellationReason';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Cancel item level request', () => {
  const userData = {};
  const cancellationReason = {
    id: uuid(),
    name: uuid(),
    description: 'description',
    publicDescription: 'public description',
  };

  before('Prepare test data', () => {
    cy.getAdminToken()
      .then(() => {
        cy.addCancellationReasonViaApi(cancellationReason);
      })
      .then(() => {
        cy.createTempUser([Permissions.settingsCircView.gui])
          .then((userProperties) => {
            userData.username = userProperties.username;
            userData.password = userProperties.password;
            userData.userId = userProperties.userId;
            userData.barcode = userProperties.barcode;
            userData.firstName = userProperties.firstName;
            userData.patronGroup = userProperties.patronGroup;
          })
          .then(() => {
            cy.login(userData.username, userData.password, {
              path: SettingsMenu.circulationRequestCancellationReasonsPath,
              waiter: CancellationReason.waitLoading,
            });
          });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    cy.deleteCancellationReasonApi(cancellationReason.id);
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C359160 Check that user can not create duplicate "Cancellation reasons" (vega)',
    { tags: ['extendedPath', 'vega'] },
    () => {
      CancellationReason.clickNewButton();
      CancellationReason.setCancellationReasonName(cancellationReason.name);
      CancellationReason.saveCancellationReason();
      CancellationReason.verifyErrorMessage('Error on saving data');
    },
  );
});
