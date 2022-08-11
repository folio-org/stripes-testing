import TopMenu from '../../support/fragments/topMenu';
import permissions from '../../support/dictionary/permissions';
import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import Users from '../../support/fragments/users/users';
import newOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import InteractorsTools from '../../support/utils/interactorsTools';
import devTeams from '../../support/dictionary/devTeams';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';

let userId;
let userName;

describe('ui-patrons: Verify that library staff can create/edit/delete a manual patron block(C476)', () => {
  before(() => {
    cy.createTempUser([permissions.uiUsersView.gui, permissions.uiUsersPatronBlocks.gui])
      .then(userProperties => {
        userId = userProperties.userId;
        userName = userProperties.username;
        cy.login(userProperties.username, userProperties.password);
      });
    cy.visit(TopMenu.usersPath);
  });

  after(() => {
    Users.deleteViaApi(userId);
  });

//   it('C476: Scenario#1&Scenario#2 (thunderjet)', { tags: [TestTypes.smoke, devTeams.thunderjet] }, () => {
//     UsersSearchPane.searchByKeywords(userName);
//     UsersCard.patronBlocksAccordionCovered();
//     // create patron block before scenario#2
//     const searchString = `${getRandomPostfix()}`;
//     const testDescription = `test ${searchString} description filter`;

//     UsersSearchPane.searchByKeywords(userName);
//     UsersCard.createAndSaveNewPatronBlock(testDescription);
//     // Scenario#2
//     UsersCard.submitPatronInformation(testDescription);
//     // UsersCard.submitThatUserHasPatrons();
//     UsersCard.selectPatronBlock(testDescription);
//     UsersCard.deletePatronBlock();
//   });
//   it('C476: Scenario#3&Scenario#4 (thunderjet)', { tags: [TestTypes.smoke, devTeams.thunderjet] }, () => {
//     UsersSearchPane.searchByKeywords(userName);
//     UsersCard.openPatronBlocks();
//     UsersCard.createPatronBlock();
//     UsersCard.submitNewBlockPageOpen();
//     UsersCard.closeNewBlockPage();
//     UsersCard.patronBlocksAccordionCovered();
//   });
  it('C476: Scenario#5,6,7,8,9 (thunderjet)', { tags: [TestTypes.smoke, devTeams.thunderjet] }, () => {
    UsersSearchPane.searchByKeywords(userName);
    UsersCard.patronBlocksAccordionCovered();
    // create patron block before scenario#2
    const searchString = `${getRandomPostfix()}`;
    const testDescription = `test ${searchString} description filter`;

    UsersSearchPane.searchByKeywords(userName);
    UsersCard.createNewPatronBlock(testDescription);
    
    cy.pause();
  });
  it('C476: Scenario#10,11,12 (thunderjet)', { tags: [TestTypes.smoke, devTeams.thunderjet] }, () => {
    UsersSearchPane.searchByKeywords(userName);
    UsersCard.patronBlocksDisabled();
    cy.pause();
  });
  it('C476: Scenario#13,14,15,16 (thunderjet)', { tags: [TestTypes.smoke, devTeams.thunderjet] }, () => {
    UsersSearchPane.searchByKeywords(userName);
    UsersCard.patronBlocksDisabled();
    cy.pause();
  });
  it('C476: Scenario#17,18 (thunderjet)', { tags: [TestTypes.smoke, devTeams.thunderjet] }, () => {
    UsersSearchPane.searchByKeywords(userName);
    UsersCard.patronBlocksDisabled();
    cy.pause();
  });
});
