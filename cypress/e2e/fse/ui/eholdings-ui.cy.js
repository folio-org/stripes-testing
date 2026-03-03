import TopMenu from '../../../support/fragments/topMenu';
import EHoldingsSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsProvidersSearch from '../../../support/fragments/eholdings/eHoldingsProvidersSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingsProviders from '../../../support/fragments/eholdings/eHoldingsProviders';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import NewNote from '../../../support/fragments/notes/newNote';
import getRandomPostfix from '../../../support/utils/stringTools';
import { APPLICATION_NAMES } from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import ExistingNoteView from '../../../support/fragments/notes/existingNoteView';
import DeleteConfirmationModal from '../../../support/fragments/notes/modal/deleteConfirmationModal';
import Agreements from '../../../support/fragments/agreements/agreements';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import eHoldingsTitle from '../../../support/fragments/eholdings/eHoldingsTitle';
import eHoldingsTitles from '../../../support/fragments/eholdings/eHoldingsTitles';

describe('fse-eholdings - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: `${TopMenu.eholdingsPath}?searchType=titles`,
      waiter: EHoldingsTitlesSearch.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC195279 - verify that eholdings module is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'ui', 'eholdings', 'TC195279'] },
    () => {
      EHoldingsTitlesSearch.byTitle('time');
      eHoldingsTitles.openTitle(0);
      eHoldingsTitle.waitPackagesLoading();
    },
  );
});

describe('fse-eholdings - UI (data manipulation)', () => {
  let agreementId;
  const defaultAgreement = { ...Agreements.defaultAgreement };

  before('Creating data', () => {
    cy.allure().logCommandSteps(false);
    cy.getAdminToken();
    defaultAgreement.name += 'FSE_TEST_TC195671';
    Agreements.createViaApi(defaultAgreement).then((agreement) => {
      agreementId = agreement.id;
    });
    cy.allure().logCommandSteps();
  });

  after('Delete test data', () => {
    cy.allure().logCommandSteps(false);
    cy.getAdminToken();
    Agreements.deleteViaApi(agreementId);
    cy.allure().logCommandSteps();
  });

  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.eholdingsPath,
      waiter: EHoldingsSearch.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC195624 - eholdings: search by provider, add tags for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['nonProd', 'fse', 'ui', 'eholdings', 'fse-user-journey', 'TC195624'] },
    () => {
      const expanded = 'true';
      // search and open Gale provider; check packages
      EHoldingsProvidersSearch.byProvider('Gale');
      EHoldingsProviders.viewProvider();
      EHoldingsProviders.verifyPackagesAccordionExpanded(expanded);
      EHoldingsProviders.verifyPackagesAvailable();
      // add tag
      const addedTag = EHoldingsProviders.addTag();
      // search by tag
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.EHOLDINGS);
      EHoldingsSearch.waitLoading();
      EHoldingsProvidersSearch.byTags(addedTag);
      EHoldingsProviders.viewProvider();
      // remove tag
      EHoldingsProviders.removeTag(addedTag);
    },
  );

  it(
    `TC195626 - eholdings: search by package, add notes for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['nonProd', 'fse', 'ui', 'eholdings', 'toBeFixed', 'TC195626'] },
    () => {
      const testNote = {
        title: `autotest_TC195626_${getRandomPostfix()}`,
        details: `autotest_TC195626_${getRandomPostfix()}`,
        getShortDetails() {
          return this.details.substring(0, 255);
        },
      };
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
      cy.wait(1000);
      // add note
      EHoldingsPackage.addNote();
      NewNote.chooseSelectTypeByTitle('General note');
      NewNote.fill(testNote);
      NewNote.save();
      // check created and assigned note
      EHoldingsPackage.verifySpecialNotesRow({
        title: testNote.title,
        details: testNote.details,
        type: 'General note',
      });
      // delete note via UI
      AgreementViewDetails.clickOnNoteRecordByTitle(testNote.title);
      ExistingNoteView.waitLoading();
      ExistingNoteView.gotoDelete();
      DeleteConfirmationModal.waitLoading();
      DeleteConfirmationModal.confirmDeleteNote();
    },
  );

  it(
    `TC195671 - eholdings: add an agreement ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['nonProd', 'fse', 'ui', 'eholdings', 'fse-user-journey', 'TC195671'] },
    () => {
      // search by package
      EHoldingsSearch.switchToPackages();
      cy.wait(1000);
      EHoldingsPackagesSearch.byName('abc-clio');
      EHoldingsPackages.openPackage();
      cy.wait(3000);
      EHoldingsPackageView.addExistingAgreement();
      EHoldingsPackageView.searchForExistingAgreement(defaultAgreement.name);
      EHoldingsPackageView.clickOnFoundAgreementInModal(defaultAgreement.name);
      EHoldingsPackageView.verifyLinkedAgreement(defaultAgreement.name);
      // delete agreement line prior to delete created agreement
      EHoldingsPackageView.clickOnAgreementInAgreementSection(defaultAgreement.name);
      AgreementViewDetails.verifyAgreementDetailsIsDisplayedByTitle(defaultAgreement.name);
      AgreementViewDetails.openAgreementLinesSection();
      cy.wait(3000);
      AgreementViewDetails.deletionOfAgreementLine();
    },
  );
});
