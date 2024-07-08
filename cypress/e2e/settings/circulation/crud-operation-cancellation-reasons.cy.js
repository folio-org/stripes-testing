import uuid from 'uuid';
import Permissions from '../../../support/dictionary/permissions';
import CancellationReason from '../../../support/fragments/settings/circulation/cancellationReason';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
// import InteractorsTools from '../../../support/utils/interactorsTools';

// TO DO: update test with duplicate and edit methods, after PO will review test case.
describe('Permition Ca', () => {
  const userData = {};
  const cancellationReason = {
    id: uuid(),
    name: uuid(),
    description: 'description',
    publicDescription: 'public description',
  };
  const editReason = {
    name: uuid(),
    description: 'new description',
    publicDescription: 'new public description',
  };

  before('Prepare test data', () => {
    cy.getAdminToken().then(() => {
      cy.createTempUser([Permissions.settingsCircView.gui])
        .then((userProperties) => {
          userData.username = userProperties.username;
          userData.password = userProperties.password;
          userData.userId = userProperties.userId;
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
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C1211 Can create, edit and remove cancelling reasons (vega)',
    { tags: ['extendedPath', 'vega', 'system'] },
    () => {
      // Create a new cancellation reason
      CancellationReason.clickNewButton();
      CancellationReason.setCancellationReason(cancellationReason);
      CancellationReason.saveCancellationReason();
      // InteractorsTools.checkCalloutMessage('The ' + cancellationReason.name + ' was successfully created', 'success');

      // Edit the cancellation reason
      CancellationReason.clickEditButtonForReason(cancellationReason.name);
      CancellationReason.setCancellationReason(editReason);
      CancellationReason.saveCancellationReason();

      // Remove the cancellation reason
      CancellationReason.clickTrashButtonForReason(editReason.name);
      CancellationReason.clickTrashButtonConfirm();
    },
  );
});
