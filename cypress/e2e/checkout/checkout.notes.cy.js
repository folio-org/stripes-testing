import { HTML, including } from '@interactors/html';

import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import AgreementsDetails from '../../support/fragments/agreements/agreementViewDetails';
import usersCard from '../../support/fragments/users/usersCard';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import NewServicePoint from '../../support/fragments/settings/tenant/servicePoints/newServicePoint';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';

describe('Check out - Notes', () => {
  let testData;
  let servicePoint;

  before('Creating data', () => {
    cy.createTempUser([
      Permissions.checkoutAll.gui,
      Permissions.uiNotesItemCreate.gui,
      Permissions.uiNotesItemView.gui,
      Permissions.uiNotesItemEdit.gui,
      Permissions.uiNotesItemDelete.gui,
      Permissions.uiUsersView.gui,
    ]).then((createdUserProperties) => {
      testData = createdUserProperties;
      servicePoint = NewServicePoint.getDefaultServicePoint();
      ServicePoints.createViaApi(servicePoint);
      UserEdit.addServicePointViaApi(
        servicePoint.id,
        createdUserProperties.userId,
        servicePoint.id,
      );
      cy.login(testData.username, testData.password);
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
    });
  });

  after('Deleting created entities', () => {
    UserEdit.changeServicePointPreferenceViaApi(testData.userId, [servicePoint.id]);
    ServicePoints.deleteViaApi(servicePoint.id);
    Users.deleteViaApi(testData.userId);
  });

  it(
    'C356781: Verify that all notes assigned to user pop up when user scan patron card (“Delete” option) (Spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      const note1 = { title: 'Note 1', details: 'This is Note 1' };
      const note2 = { title: 'Note 2', details: 'This is Note 2' };

      UsersSearchPane.searchByUsername(testData.username);
      UsersSearchPane.waitLoading();
      usersCard.openNotesSection();
      AgreementsDetails.createNote({ ...note1, checkoutApp: true });
      usersCard.openNotesSection();
      AgreementsDetails.createNote({ ...note2, checkoutApp: true });
      cy.visit(TopMenu.checkOutPath);
      CheckOutActions.checkOutUser(testData.barcode);
      CheckOutActions.checkUserNote(note1);
      CheckOutActions.deleteNote();
      CheckOutActions.checkUserNote(note2);
      CheckOutActions.deleteNote();
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByUsername(testData.username);
      UsersSearchPane.waitLoading();
      usersCard.openNotesSection();
      cy.expect(HTML(including('No notes found')).exists());
    },
  );
});
