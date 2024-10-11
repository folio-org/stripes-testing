import TopMenu from '../../../support/fragments/topMenu';
import EHoldingsSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsProvidersSearch from '../../../support/fragments/eholdings/eHoldingsProvidersSearch';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingsProviders from '../../../support/fragments/eholdings/eHoldingsProviders';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import NewNote from '../../../support/fragments/notes/newNote';
import getRandomPostfix from '../../../support/utils/stringTools';
import AssignNote from '../../../support/fragments/notes/modal/assign-unassign-notes';

describe('fse-eholdings - UI for production tenants', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195279 - verify that eholdings module is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'eholdings'] },
    () => {
      cy.visit(TopMenu.eholdingsPath);
      EHoldingsSearch.waitLoading();
    },
  );
});

describe('fse-eholdings - UI for non-production tenants', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195624 - eholdings: search by provider, add tags for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['non-live', 'fse', 'ui', 'eholdings'] },
    () => {
      const expanded = 'true';
      cy.visit(TopMenu.eholdingsPath);
      // search and open Gale provider; check packages
      EHoldingsProvidersSearch.byProvider('Gale');
      EHoldingsProviders.viewProvider();
      EHoldingsProviders.verifyPackagesAccordionExpanded(expanded);
      EHoldingsProviders.verifyPackagesAvailable();
      // add tag
      const addedTag = EHoldingsProviders.addTag();
      // search by tag
      cy.visit(TopMenu.eholdingsPath);
      EHoldingsSearch.waitLoading();
      EHoldingsProvidersSearch.byTags(addedTag);
      EHoldingsProviders.viewProvider();
      // remove tag
      EHoldingsProviders.removeTag(addedTag);
    },
  );

  it(
    `TC195626 - eholdings: search by package, add notes for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['non-live', 'fse', 'ui', 'eholdings'] },
    () => {
      const testNote = {
        title: `autotest_TC195626_${getRandomPostfix()}`,
        details: `autotest_TC195626_${getRandomPostfix()}`,
        getShortDetails() {
          return this.details.substring(0, 255);
        },
      };

      cy.visit(TopMenu.eholdingsPath);
      // search by package
      EHoldingsSearch.switchToPackages();
      cy.wait(1000);
      EHoldingsPackagesSearch.byName('abc-clio');
      EHoldingsPackages.openPackage();
      cy.wait(3000);
      EHoldingsPackage.removeFromHoldings();
      cy.wait(1000);
      EHoldingsPackage.checkEmptyTitlesList();
      cy.wait(1000);
      // reset test data
      EHoldingsPackage.addToHoldings();
      // add note
      EHoldingsPackage.addNote();
      NewNote.chooseSelectTypeByTitle('General note');
      NewNote.fill(testNote);
      NewNote.save();
      // check created and assigned note
      EHoldingsPackage.verifySpecialNotesRow({
        title: testNote.title,
        details: testNote.content,
        type: 'General note',
      });
      // unassign note
      EHoldingsPackage.clickAssignNoteButton();
      AssignNote.verifyModalIsShown();
      AssignNote.searchForNote(testNote.title);
      AssignNote.verifyDesiredNoteIsShown(testNote.title);
      AssignNote.clickCheckboxForNote(testNote.title);
      AssignNote.clickSaveButton();
    },
  );
});
