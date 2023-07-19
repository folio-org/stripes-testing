import marc from '../../support/a_ideyalabs/marc';
import inventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import inventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import marcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import marcAuthoritiesDelete from '../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import marcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import topMenu from '../../support/fragments/topMenu';

const testData = {
  searchOption: 'Keyword',
  value: 'Speaking Oratory debating',
  searchHoldingOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
  holdingValue: 'The !!!Kung of Nyae Nyae / Lorna Marshall.',
  record: 'Gibbons, Boyd',

  derive: {
    searchOption: 'Personal name',
    value: 'Gibbons, Boyd',
    tagValue: '700',
    rowIndex: 1,
  },
  link: {
    searchOption: 'Personal name',
    value: 'Gibbons, Boyd',
    tagValue: '700',
    content: ' ',
    rowIndex: 1,
  },
};

describe('Feature MARC Authority', () => {
  before('login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it('C375070 Link the 650 of MARC Bib field with 150 field of MARC Authority record.', () => {
    cy.visit(topMenu.inventoryPath);
    inventorySearchAndFilter.switchToHoldings();
    inventorySearchAndFilter.bySource('MARC');
    cy.wait(2000);
    inventorySearchAndFilter.selectSearchResultByRowIndex(
      testData.derive.rowIndex
    );
    // inventorySearchAndFilter.selectSearchResultItem();
    inventoryInstance.editMarcBibliographicRecord();
    inventoryInstance.verifyAndClickLinkIcon('650');
    marcAuthorities.switchToSearch();
    inventoryInstance.verifySearchOptions();
    marcAuthorities.clickReset();
    marcAuthorities.searchBy(testData.searchOption, testData.value);
    marcAuthorities.clickLinkButton();
    marcAuthority.checkLinkingAuthority650();
    marc.saveAndClose();
    inventoryInstance.viewSource();
    marcAuthorities.closeMarcViewPane();
    inventoryInstance.editMarcBibliographicRecord();
    cy.wait(2000);
    inventoryInstance.verifyAndClickUnlinkIcon('650');
    marc.popupUnlinkButton();
    marc.saveAndClose();
    inventoryInstance.viewSource();
  });

  it('C365602 Derive Unlink MARC Bibliographic field from MARC Authority record and use the Save close button in deriving window', () => {
    cy.visit(topMenu.inventoryPath);
    inventorySearchAndFilter.switchToHoldings();
    inventorySearchAndFilter.bySource('MARC');
    cy.wait(3000);
    inventorySearchAndFilter.selectSearchResultByRowIndex(
      testData.derive.rowIndex
    );
    inventoryInstance.editMarcBibliographicRecord();

    const unlinkButton = inventoryInstance.verifyUnlinkIcon(
      testData.derive.tagValue
    );
    if (unlinkButton) {
      inventoryInstance.verifyAndClickLinkIcon(testData.derive.tagValue);
      inventoryInstance.verifySearchOptions();
      marcAuthorities.clickReset();
      marcAuthorities.searchBy(
        testData.derive.searchOption,
        testData.derive.value
      );
      marcAuthorities.clickLinkButton();
      marcAuthority.checkLinkingAuthority700();
      marc.saveAndClose();
    } else {
      marc.closeEditMarc();
    }
    inventoryInstance.deriveNewMarcBibRecord();
    marc.keepLinkingButton();
    inventoryInstance.verifyAndClickUnlinkIcon(testData.derive.tagValue);
    marc.popupUnlinkButton();
    marc.saveAndClose();
    inventoryInstance.editMarcBibliographicRecord();
    inventoryInstance.verifyLinkIcon(testData.derive.tagValue);
  });

  it('C380755 Link of empty MARC Bib field with MARC Authority record', () => {
    cy.visit(topMenu.inventoryPath);
    inventorySearchAndFilter.switchToHoldings();
    inventorySearchAndFilter.bySource('MARC');
    cy.wait(2000);
    inventorySearchAndFilter.selectSearchResultByRowIndex(
      testData.link.rowIndex
    );
    inventoryInstance.editMarcBibliographicRecord();
    inventoryInstance.verifyAndClickUnlinkIcon(testData.link.tagValue);
    marc.popupUnlinkButton();
    inventoryInstance.verifyAndClickLinkIcon(testData.link.tagValue);
    marcAuthorities.switchToSearch();
    inventoryInstance.verifySearchOptions();
    marcAuthorities.searchBy(testData.link.searchOption, testData.link.value);
    marcAuthorities.clickLinkButton();
    marcAuthority.checkLinkingAuthority700();
    marc.saveAndClose();
  });

  it('C376987:print marcfile', () => {
    cy.visit(topMenu.marcAuthorities);
    marcAuthorities.serchbeats('Beatles');
    marcAuthorities.clickActionsButton();
    inventoryInstance.selectRecord();
    marcAuthoritiesDelete.clickprintButton();
    cy.exec('java -jar sikuli_ide.jar -r printer.sikuli');
    cy.wait(3000);
  });

  it('C388651 - 008 field updated when valid LDR 06-07 combinations entered when editing MARC bib record', () => {
    // cy.login(Cypress.env("diku_login"), Cypress.env("diku_password"));

    cy.visit(topMenu.inventoryPath);
    inventorySearchAndFilter.switchToHoldings();
    inventorySearchAndFilter.bySource('MARC');
    cy.wait(3000);
    inventorySearchAndFilter.selectSearchResultByRowIndex(
      testData.derive.rowIndex
    );
    inventoryInstance.editMarcBibliographicRecord();
  });
});
