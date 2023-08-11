import marc from '../../support/ideyaLabs/marc';
import testTypes from '../../support/dictionary/testTypes';
import inventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import inventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import marcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import marcAuthoritiesDelete from '../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import marcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import topMenu from '../../support/fragments/topMenu';

describe.skip('Feature MARC Authority', () => {

  const testData = {
    source: 'MARC',
    searchOption: 'Keyword',
    authority650FieldValue: 'Speaking Oratory debating',
    searchHoldingOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
    holdingValue: 'The !!!Kung of Nyae Nyae / Lorna Marshall.',
    record: 'Gibbons, Boyd',
    accordion: 'Subject',
    marcRecord: 'Beatles',
    tag: {
      tag650: '650',
    },
    derive: {
      searchOption: 'Personal name',
      authority700FieldValue: 'Gibbons, Boyd',
      tag700: '700',
      rowIndex: 1,
      accordion: 'Contributor',
      content: ' ',
    },
  };

  before('Login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it(
    'C375070 Link the ""650"" of ""MARC Bib"" field with ""150"" field of ""MARC Authority"" record. (spitfire)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      cy.visit(topMenu.inventoryPath);
      inventorySearchAndFilter.switchToHoldings();
      inventorySearchAndFilter.bySource(testData.source);
      inventorySearchAndFilter.selectSearchResultByRowIndex(
        testData.derive.rowIndex
      );
      inventoryInstance.editMarcBibliographicRecord();
      inventoryInstance.verifyAndClickLinkIcon(testData.tag.tag650);
      marcAuthorities.switchToSearch();
      inventoryInstance.verifySearchOptions();
      marcAuthorities.clickReset();
      inventoryInstance.searchResults(testData.authority650FieldValue);
      marcAuthorities.clickLinkButton();
      marcAuthority.checkLinkingAuthority650();
      marc.saveAndClose();
      inventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane(
        testData.accordion
      );
      inventoryInstance.viewSource();
      marcAuthorities.closeMarcViewPane();
      inventoryInstance.editMarcBibliographicRecord();
      inventoryInstance.verifyAndClickUnlinkIcon(testData.tag.tag650);
      marc.popupUnlinkButton();
      marc.saveAndClose();
      inventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane(
        testData.accordion
      );
      inventoryInstance.viewSource();
      marcAuthorities.checkFieldAndContentExistence(
        testData.tag650,
        `‡a ${testData.authority650FieldValue}`
      );
    }
  );

  it(
    'C365602 Derive | Unlink ""MARC Bibliographic"" field from ""MARC Authority"" record and use the ""Save & close"" button in deriving window. (spitfire)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      cy.visit(topMenu.inventoryPath);
      inventorySearchAndFilter.switchToHoldings();
      inventorySearchAndFilter.bySource(testData.source);
      inventorySearchAndFilter.selectSearchResultByRowIndex(
        testData.derive.rowIndex
      );
      inventoryInstance.editMarcBibliographicRecord();

      const unlinkButton = inventoryInstance.verifyUnlinkIcon(
        testData.derive.tag700
      );
      if (unlinkButton) {
        inventoryInstance.verifyAndClickLinkIcon(testData.derive.tag700);
        inventoryInstance.verifySearchOptions();
        marcAuthorities.clickReset();
        marcAuthorities.searchBy(
          testData.derive.searchOption,
          testData.derive.authority700FieldValue
        );
        marcAuthorities.clickLinkButton();
        marcAuthority.checkLinkingAuthority700();
        marc.saveAndClose();
      } else {
        marc.closeEditMarc();
      }
      inventoryInstance.deriveNewMarcBibRecord();
      marc.keepLinkingButton();
      inventoryInstance.verifyAndClickUnlinkIcon(testData.derive.tag700);
      marc.popupUnlinkButton();
      marc.saveAndClose();
      inventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane(
        testData.derive.accordion
      );
      inventoryInstance.editMarcBibliographicRecord();
      inventoryInstance.verifyLinkIcon(testData.derive.tag700);
    }
  );

  it(
    'C380755 Link of empty MARC Bib field with ""MARC Authority"" record (spitfire)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      cy.visit(topMenu.inventoryPath);
      inventorySearchAndFilter.switchToHoldings();
      inventorySearchAndFilter.bySource(testData.source);
      inventorySearchAndFilter.selectSearchResultByRowIndex(
        testData.derive.rowIndex
      );
      inventoryInstance.editMarcBibliographicRecord();
      inventoryInstance.verifyAndClickUnlinkIcon(testData.derive.tag700);
      marc.popupUnlinkButton();
      inventoryInstance.verifyAndClickLinkIcon(testData.derive.tag700);
      marcAuthorities.switchToSearch();
      inventoryInstance.verifySelectMarcAuthorityModal();
      inventoryInstance.verifySearchOptions();
      marcAuthorities.searchBy(
        testData.derive.searchOption,
        testData.derive.authority700FieldValue
      );
      marcAuthorities.clickLinkButton();
      marcAuthority.checkLinkingAuthority700();
      marc.saveAndClose();
      inventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane(
        testData.derive.accordion
      );
    }
  );

  it(
    'C376987 User can print ""MARC authority"" record (spitfire)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      cy.visit(topMenu.marcAuthorities);
      marcAuthorities.searchBeats(testData.marcRecord);
      marcAuthorities.clickActionsButton();
      inventoryInstance.selectRecord();
      marcAuthoritiesDelete.clickprintButton();
      cy.exec('java -jar sikuli_ide.jar -r printer.sikuli');
    }
  );

  it(
    'C388651 ""008"" field updated when valid LDR 06-07 combinations entered when editing ""MARC bib"" record ( Spitfire)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      cy.visit(topMenu.inventoryPath);
      inventorySearchAndFilter.switchToHoldings();
      inventorySearchAndFilter.bySource(testData.source);
      inventorySearchAndFilter.selectSearchResultByRowIndex(
        testData.derive.rowIndex
      );
      inventoryInstance.editMarcBibliographicRecord();
    }
  );
  
});

