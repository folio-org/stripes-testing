import Agreements from '../../../support/fragments/agreements/agreements';
import TopMenu from '../../../support/fragments/topMenu';
import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import EditAgreement from '../../../support/fragments/agreements/editAgreement';
import Users from '../../../support/fragments/users/users';
import SelectUser from '../../../support/fragments/users/modal/selectUser';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import { TestTypes, DevTeams } from '../../../support/dictionary';

let agreementId;
const firstUser = {
  active: true,
  username: `firstUserName ${randomFourDigitNumber()}`,
  personal: {
    preferredContactTypeId: '002',
    firstName: 'firstUserFirstName',
    middleName: 'firstUserMiddleName',
    lastName: 'firstUserLastName',
    email: 'test@folio.org',
  },
  departments: [],
};
const secondUser = {
  active: true,
  username: `secondUserName ${randomFourDigitNumber()}`,
  personal: {
    preferredContactTypeId: '002',
    firstName: 'secondUserFirstName',
    middleName: 'secondUserMiddleName',
    lastName: 'secondUserLastName',
    email: 'test2@folio.org',
  },
  departments: [],
};
let firstUserId;
let secondUserId;
const userRole = 'Subject specialist';
describe('Agreement Internal Contacts', () => {
  before('Create test data', () => {
    cy.getAdminToken();
    Users.createViaApi(firstUser).then((userData) => {
      firstUserId = userData.id;
    });
    Users.createViaApi(secondUser)
      .then((userData) => {
        secondUserId = userData.id;
      })
      .then(() => {
        Agreements.createViaApi().then((agr) => {
          agreementId = agr.id;
        });
      });
    cy.loginAsAdmin({
      path: TopMenu.agreementsPath,
      waiter: Agreements.waitLoading,
    });
  });

  after('Delete test data', () => {
    Users.deleteViaApi(firstUserId);
    Users.deleteViaApi(secondUserId);
    Agreements.deleteViaApi(agreementId);
  });

  it(
    'C1314 Assign a library staff member to an Agreement (erm) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.erm] },
    () => {
      AgreementViewDetails.agreementListClick(Agreements.defaultAgreement.name);
      AgreementViewDetails.gotoEdit();
      EditAgreement.clickAddInternalContact();
      EditAgreement.clickLinkUser();
      SelectUser.verifyModalIsShown();

      SelectUser.findAndSelectUser(firstUser.username);
      EditAgreement.verifyInternalContactIsShown(firstUser.personal.lastName);

      EditAgreement.setRoleByName(firstUser.personal.lastName, userRole);
      EditAgreement.saveAndClose();
      AgreementViewDetails.verifyInternalContactsCount('1');

      AgreementViewDetails.openInternalContactsSection();
      AgreementViewDetails.verifyInternalContactsRow({
        username: firstUser.personal.lastname,
        email: firstUser.personal.email,
      });

      AgreementViewDetails.gotoEdit();
      EditAgreement.clickAddInternalContact();
      EditAgreement.clickLinkUser();
      SelectUser.verifyModalIsShown();

      SelectUser.findAndSelectUser(secondUser.username);
      EditAgreement.verifyInternalContactIsShown(secondUser.personal.lastName);

      EditAgreement.setRoleByName(secondUser.personal.lastName, userRole);
      EditAgreement.saveAndClose();
      AgreementViewDetails.verifyInternalContactsCount('2');

      AgreementViewDetails.openInternalContactsSection();
      AgreementViewDetails.verifyInternalContactsRow({
        username: firstUser.personal.lastname,
        email: firstUser.personal.email,
      });

      AgreementViewDetails.openInternalContactsSection();
      AgreementViewDetails.verifyInternalContactsRow({
        username: secondUser.personal.lastname,
        email: secondUser.personal.email,
      });
    },
  );
});
