/* eslint-disable cypress/no-unnecessary-waiting */
import { INSTANCE_SOURCE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

let user;
let instanceRecord;
const OCLCAuthentication = '100481406/PAOLF';
const oclcRecordData = {
  title: 'Cooking Light Soups & Stew',
  language: 'English',
  publisher: 'TI Inc. Books',
  placeOfPublication: 'Chicago',
  publicationDate: '2020',
  physicalDescription: '1 online resource (142 p.)',
  isbn1: '154785474X',
  isbn2: '9781547854745',
  oclc: '1202462670',
  subject: 'Soups',
  notes: {
    noteType: 'General note',
    noteContent: 'Description based upon print version of record',
  },
};

describe('Inventory', () => {
  describe('Single record import', () => {
    before('Create test data and login', () => {
      cy.getAdminToken().then(() => {
        Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication);
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          instanceRecord = instanceData;
        });
      });

      cy.createTempUser([
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.uiInventorySingleRecordImport.gui,
        Permissions.uiInventorySettingsConfigureSingleRecordImport.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        InventoryInstance.deleteInstanceViaApi(instanceRecord.instanceId);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C343349 Overlay existing Source = FOLIO Instance by import of single MARC Bib record from OCLC (folijet)',
      { tags: ['smoke', 'folijet', 'C343349'] },
      () => {
        InventorySearchAndFilter.searchByParameter(
          'Keyword (title, contributor, identifier, HRID, UUID)',
          instanceRecord.instanceTitle,
        );
        InventorySearchAndFilter.selectSearchResultItem();
        InventoryInstance.startOverlaySourceBibRecord();
        InventoryInstance.overlayWithOclc(oclcRecordData.oclc);
        InventoryInstance.checkCalloutMessage(
          `Record ${oclcRecordData.oclc} updated. Results may take a few moments to become visible in Inventory`,
        );
        cy.wait(15000);
        InventoryInstance.waitInstanceRecordViewOpened(oclcRecordData.title);
        InventoryInstance.verifyLastUpdatedDate();
        InstanceRecordView.verifyInstanceSource(INSTANCE_SOURCE_NAMES.MARC);
        InventoryInstance.verifyInstanceTitle(oclcRecordData.title);
        InventoryInstance.verifyInstanceLanguage(oclcRecordData.language);
        InventoryInstance.verifyInstancePublisher({
          publisher: oclcRecordData.publisher,
          place: oclcRecordData.placeOfPublication,
          date: oclcRecordData.publicationDate,
        });
        InventoryInstance.verifyInstancePhysicalcyDescription(oclcRecordData.physicalDescription);
        InventoryInstance.openAccordion('Identifiers');
        InventoryInstance.verifyResourceIdentifier('ISBN', oclcRecordData.isbn1, 8);
        InventoryInstance.verifyResourceIdentifier('ISBN', oclcRecordData.isbn2, 9);
        InventoryInstance.openAccordion('Subject');
        InstanceRecordView.verifyInstanceSubject({
          indexRow: 0,
          subjectHeadings: oclcRecordData.subject,
          subjectSource: 'Library of Congress Subject Headings',
          subjectType: 'Topical term',
        });
        InventoryInstance.openAccordion('Instance notes');
        InventoryInstance.checkInstanceNotes(
          oclcRecordData.notes.noteType,
          oclcRecordData.notes.noteContent,
        );

        InstanceRecordView.viewSource();
        InventoryViewSource.contains('020\t');
        InventoryViewSource.contains(oclcRecordData.isbn1);
        InventoryViewSource.contains('020\t');
        InventoryViewSource.contains(oclcRecordData.isbn2);
        InventoryViewSource.contains('245\t');
        InventoryViewSource.contains(oclcRecordData.title);
        InventoryViewSource.contains('300\t');
        InventoryViewSource.contains(oclcRecordData.physicalDescription);
        InventoryViewSource.contains('650\t');
        InventoryViewSource.contains(oclcRecordData.subject);
      },
    );
  });
});
