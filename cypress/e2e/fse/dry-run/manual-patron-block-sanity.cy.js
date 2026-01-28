import { APPLICATION_NAMES } from '../../../support/constants';
import PatronBlockTemplates from '../../../support/fragments/settings/users/patronBlockTemplates';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../support/utils/users';

describe('Fees&Fines', () => {
  describe('Manual Patron Blocks', () => {
    const { user, memberTenant } = parseSanityParameters();
    const searchString = `${getRandomPostfix()}`;
    const templateName = `Template name_${searchString}`;
    const testDescription = `test ${searchString} description filter`;

    before('Setup', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password)
        .then(() => {
          cy.getUserDetailsByUsername(user.username).then((details) => {
            user.id = details.id;
            user.personal = details.personal;
            user.barcode = details.barcode;
          });
        })
        .then(() => {
          // Login and create patron template
          cy.allure().logCommandSteps(false);
          cy.login(user.username, user.password, {
            path: SettingsMenu.patronBlockTemplates,
            waiter: () => cy.wait(5000),
          });
          cy.allure().logCommandSteps();
          PatronBlockTemplates.newPatronTemplate();
          PatronBlockTemplates.fillInPatronTemplateInformation(templateName, testDescription);
        })
        .then(() => {
          TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.USERS);
        });
    });

    after('Cleanup', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password);

      // Delete patron template
      cy.visit(SettingsMenu.patronBlockTemplates);
      cy.wait(3000);
      PatronBlockTemplates.findPatronTemplate(templateName);
      PatronBlockTemplates.editPatronTemplate();
      PatronBlockTemplates.deletePatronTemplate();
    });

    it('C476 Scenario#1&Scenario#2 (vega)', { tags: ['dryRun', 'vega', 'C476'] }, () => {
      UsersSearchPane.resetAllFilters();
      UsersSearchPane.searchByKeywords(user.username);
      UsersCard.patronBlocksAccordionCovered();

      UsersSearchPane.resetAllFilters();
      UsersSearchPane.searchByKeywords(user.username);
      UsersCard.createAndSaveNewPatronBlock(testDescription);
      // Scenario#2
      UsersCard.submitPatronInformation(testDescription);
      UsersCard.selectPatronBlock(testDescription);
      UsersCard.deletePatronBlock();
    });
    it('C476 Scenario#3&Scenario#4 (vega)', { tags: ['dryRun', 'vega', 'C476'] }, () => {
      UsersSearchPane.resetAllFilters();
      UsersSearchPane.searchByKeywords(user.username);
      UsersCard.openPatronBlocks();
      // Scenario#3
      UsersCard.createPatronBlock();
      UsersCard.submitNewBlockPageOpen();
      // Scenario#4
      UsersCard.closeNewBlockPage();
      UsersCard.patronBlocksAccordionCovered();
    });
    it('C476 Scenario#5,6,7,8,9 (vega)', { tags: ['dryRun', 'vega', 'C476'] }, () => {
      // scenario#5
      UsersSearchPane.resetAllFilters();
      UsersSearchPane.searchByKeywords(user.username);
      UsersCard.patronBlocksAccordionCovered();

      UsersSearchPane.resetAllFilters();
      UsersSearchPane.searchByKeywords(user.username);
      UsersCard.createNewPatronBlock(testDescription);
      // scenario#6
      UsersCard.selectTodayExpirationDate();
      UsersCard.submitWrongExpirationDate();
      // scenario#7
      UsersCard.selectTomorrowExpirationDate();
      UsersCard.saveAndClose();
      // scenario#8
      UsersCard.selectPatronBlock(testDescription);
      UsersCard.openLastUpdatedInfo();
      // scenario#9
      UsersCard.deletePatronBlock();
    });
    it('C476 Scenario#10,11,12,13,14,15,16 (vega)', { tags: ['dryRun', 'vega', 'C476'] }, () => {
      UsersSearchPane.resetAllFilters();
      UsersSearchPane.searchByKeywords(user.username);
      UsersCard.patronBlocksAccordionCovered();

      UsersSearchPane.resetAllFilters();
      UsersSearchPane.searchByKeywords(user.username);
      // scenario#10
      UsersCard.createNewPatronBlock(testDescription);
      // scenario#11
      UsersCard.selectTodayExpirationDate();
      UsersCard.submitWrongExpirationDate();
      UsersCard.selectTomorrowExpirationDate();
      // scenario#12
      UsersCard.saveAndClose();
      UsersCard.submitPatronInformation(testDescription);
      // scenario#13,14,15,16
      UsersCard.selectPatronBlock(testDescription);
      UsersCard.deletePatronBlock();
    });
    it('C476 Scenario#17,18 (vega)', { tags: ['dryRun', 'vega', 'C476'] }, () => {
      UsersSearchPane.resetAllFilters();
      UsersSearchPane.searchByKeywords(user.username);
      UsersCard.openPatronBlocks();
      UsersCard.createPatronBlock();
      UsersCard.selectTemplate(templateName);
      UsersCard.saveAndClose();
      UsersCard.selectPatronBlock(testDescription);
      UsersCard.deletePatronBlock();
    });
  });
});
