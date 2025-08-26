import uuid from 'uuid';
import Permissions from '../../../support/dictionary/permissions';
import CancellationReason from '../../../support/fragments/settings/circulation/cancellationReason';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Permissions -> Circulation', () => {
  const userData = {};
  const newCancellationReason = {
    id: uuid(),
    name: uuid(),
    description: 'description',
    publicDescription: 'public description',
  };
  const editCancellationReason = {
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
    CancellationReason.deleteCancellationReasonByNameViaAPI(newCancellationReason.name);
    CancellationReason.deleteCancellationReasonByNameViaAPI(editCancellationReason.name);
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C1211 Can create, edit and remove cancelling reasons (vega)',
    { tags: ['extendedPath', 'vega', 'C1211'] },
    () => {
      // Create a new cancellation reason
      CancellationReason.clickNewButton();
      CancellationReason.fillCancellationReason(newCancellationReason);
      CancellationReason.saveCancellationReason();
      InteractorsTools.checkCalloutMessage(
        `The  ${newCancellationReason.name} was successfully created`,
      );
      CancellationReason.verifyReasonInTheList(
        newCancellationReason,
        newCancellationReason.description,
        newCancellationReason.publicDescription,
      );

      // Edit the cancellation reason
      CancellationReason.clickEditButtonForReason(newCancellationReason.name);
      CancellationReason.fillCancellationReason(editCancellationReason);
      CancellationReason.saveCancellationReason();
      InteractorsTools.checkCalloutMessage(
        `The  ${editCancellationReason.name} was successfully updated`,
      );
      CancellationReason.verifyReasonInTheList(
        editCancellationReason,
        editCancellationReason.description,
        editCancellationReason.publicDescription,
      );

      // Remove the cancellation reason
      CancellationReason.clickTrashButtonForReason(editCancellationReason.name);
      CancellationReason.clickTrashButtonConfirm();
      InteractorsTools.checkCalloutMessage(
        `The cancel reason ${editCancellationReason.name} was successfully deleted`,
      );
      CancellationReason.verifyReasonAbsentInTheList(editCancellationReason.name);
    },
  );
});
