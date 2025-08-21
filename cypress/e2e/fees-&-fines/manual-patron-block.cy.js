import { APPLICATION_NAMES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import PatronBlockTemplates from '../../support/fragments/settings/users/patronBlockTemplates';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';

let userId;
let userName;
const expirationUserDate = DateTools.getFutureWeekDateObj();
const searchString = `${getRandomPostfix()}`;
const templateName = `Template name_${searchString}`;
const testDescription = `test ${searchString} description filter`;

describe('Fees&Fines', () => {
  describe('Manual Patron Blocks', () => {
    beforeEach(() => {
      cy.getAdminToken();
      cy.createTempUser([
        permissions.uiUsersView.gui,
        permissions.uiUsersPatronBlocks.gui,
        permissions.uiUsersCreatePatronConditions.gui,
        permissions.uiUsersCreateEditRemovePatronGroups.gui,
        permissions.uiUsersCreatePatronLimits.gui,
        permissions.uiUsersCreatePatronTamplate.gui,
      ]).then((userProperties) => {
        userId = userProperties.userId;
        userName = userProperties.username;
        userProperties.expirationDate = expirationUserDate;
        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.patronBlockTemplates,
          waiter: () => cy.wait(5000),
        });
        PatronBlockTemplates.newPatronTemplate();
        PatronBlockTemplates.fillInPatronTemplateInformation(templateName, testDescription);
      });

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
    });

    afterEach(() => {
      cy.visit(SettingsMenu.patronBlockTemplates);
      cy.wait(3000);
      PatronBlockTemplates.findPatronTemplate(templateName);
      PatronBlockTemplates.editPatronTemplate();
      PatronBlockTemplates.deletePatronTemplate();
      cy.getAdminToken();
      Users.deleteViaApi(userId);
      cy.wait(3000);
    });

    it(
      'C476 Scenario#1&Scenario#2 (vega)',
      { tags: ['smoke', 'vega', 'system', 'shiftLeft', 'C476'] },
      () => {
        UsersSearchPane.resetAllFilters();
        UsersSearchPane.searchByKeywords(userName);
        UsersCard.patronBlocksAccordionCovered();

        UsersSearchPane.resetAllFilters();
        UsersSearchPane.searchByKeywords(userName);
        UsersCard.createAndSaveNewPatronBlock(testDescription);
        // Scenario#2
        UsersCard.submitPatronInformation(testDescription);
        UsersCard.selectPatronBlock(testDescription);
        UsersCard.deletePatronBlock();
      },
    );
    it(
      'C476 Scenario#3&Scenario#4 (vega)',
      { tags: ['smoke', 'vega', 'system', 'shiftLeft', 'C476'] },
      () => {
        UsersSearchPane.resetAllFilters();
        UsersSearchPane.searchByKeywords(userName);
        UsersCard.openPatronBlocks();
        // Scenario#3
        UsersCard.createPatronBlock();
        UsersCard.submitNewBlockPageOpen();
        // Scenario#4
        UsersCard.closeNewBlockPage();
        UsersCard.patronBlocksAccordionCovered();
      },
    );
    it(
      'C476 Scenario#5,6,7,8,9 (vega)',
      { tags: ['smoke', 'vega', 'system', 'shiftLeft', 'C476'] },
      () => {
        // scenario#5
        UsersSearchPane.resetAllFilters();
        UsersSearchPane.searchByKeywords(userName);
        UsersCard.patronBlocksAccordionCovered();

        UsersSearchPane.resetAllFilters();
        UsersSearchPane.searchByKeywords(userName);
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
      },
    );
    it(
      'C476 Scenario#10,11,12,13,14,15,16 (vega)',
      { tags: ['smoke', 'vega', 'system', 'shiftLeft', 'C476'] },
      () => {
        UsersSearchPane.resetAllFilters();
        UsersSearchPane.searchByKeywords(userName);
        UsersCard.patronBlocksAccordionCovered();

        UsersSearchPane.resetAllFilters();
        UsersSearchPane.searchByKeywords(userName);
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
      },
    );
    it(
      'C476 Scenario#17,18 (vega)',
      { tags: ['smoke', 'vega', 'system', 'shiftLeft', 'C476'] },
      () => {
        UsersSearchPane.resetAllFilters();
        UsersSearchPane.searchByKeywords(userName);
        UsersCard.openPatronBlocks();
        UsersCard.createPatronBlock();
        UsersCard.selectTemplate(templateName);
        UsersCard.saveAndClose();
        UsersCard.selectPatronBlock(testDescription);
        UsersCard.deletePatronBlock();
      },
    );
  });
});
