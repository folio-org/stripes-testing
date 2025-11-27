import {
  DEFAULT_JOB_PROFILE_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';

describe('Inventory', () => {
  describe('Import MARC bib', () => {
    const testData = {
      instanceTitle: 'C934322 Instance note types mapping test',
      marcFile: {
        marc: 'marcBibFileForC934322.mrc',
        fileName: `testMarcFileC934322.${randomFourDigitNumber()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        numberOfRecords: 1,
        propertyName: 'instance',
      },
      notes: [
        {
          rowIndex: 0,
          columnHeader: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCESSIBILITY_NOTE,
          value: 'This is Accessibility note',
        },
        {
          rowIndex: 1,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCUMULATION_FREQUENCY_USE_NOTE,
          value: 'This is Accumulation and Frequency of Use note',
        },
        {
          rowIndex: 2,
          columnHeader: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE,
          value: 'This is Action note',
        },
        {
          rowIndex: 3,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES
              .ADDITIONAL_PHYSICAL_FORM_AVAILABLE_NOTE,
          value: 'This is Additional Physical Form Available note',
        },
        {
          rowIndex: 4,
          columnHeader: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.AWARDS_NOTE,
          value: 'This is Awards note',
        },
        {
          rowIndex: 5,
          columnHeader: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIBLIOGRAPHY_NOTE,
          value: 'This is Bibliography note',
        },
        {
          rowIndex: 6,
          columnHeader: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BINDING_INFORMATION_NOTE,
          value: 'This is Binding Information note',
        },
        {
          rowIndex: 7,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIOGRAPHICAL_HISTORICAL_DATA,
          value: 'This is Biographical or Historical Data note',
        },
        {
          rowIndex: 8,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CARTOGRAPHIC_MATHEMATICAL_DATA,
          value: 'This is Cartographic Mathematical Data note',
        },
        {
          rowIndex: 9,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CASE_FILE_CHARACTERISTICS_NOTE,
          value: 'This is Case File Characteristics note',
        },
        {
          rowIndex: 10,
          columnHeader: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CITATION_REFERENCES_NOTE,
          value: 'This is Citation / References note',
        },
        {
          rowIndex: 11,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.COPY_VERSION_IDENTIFICATION_NOTE,
          value: 'This is Copy and Version Identification note',
        },
        {
          rowIndex: 12,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CREATION_PRODUCTION_CREDITS_NOTE,
          value: 'This is Creation / Production Credits note',
        },
        {
          rowIndex: 13,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CUMULATIVE_INDEX_FINDING_AIDS_NOTES,
          value: 'This is Cumulative Index / Finding Aids notes',
        },
        {
          rowIndex: 14,
          columnHeader: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DATA_QUALITY_NOTE,
          value: 'This is Data Quality note',
        },
        {
          rowIndex: 15,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DATE_TIME_PLACE_EVENT_NOTE,
          value: 'This is Date / Time and place of an event note',
        },
        {
          rowIndex: 16,
          columnHeader: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
          value: 'This is Dissertation note',
        },
        {
          rowIndex: 17,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ENTITY_ATTRIBUTE_INFORMATION_NOTE,
          value: 'This is Entity and Attribute Information note',
        },
        {
          rowIndex: 18,
          columnHeader: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.EXHIBITIONS_NOTE,
          value: 'This is Exhibitions note',
        },
        {
          rowIndex: 19,
          columnHeader: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATTED_CONTENTS_NOTE,
          value: 'This is Formatted Contents note',
        },
        {
          rowIndex: 20,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMER_TITLE_COMPLEXITY_NOTE,
          value: 'This is Former Title Complexity note',
        },
        {
          rowIndex: 21,
          columnHeader: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FUNDING_INFORMATION_NOTE,
          value: 'This is Funding Information Note',
        },
        {
          rowIndex: 22,
          columnHeader: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
          value: 'This is General note',
        },
        {
          rowIndex: 23,
          columnHeader: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GEOGRAPHIC_COVERAGE_NOTE,
          value: 'This is Geographic Coverage note',
        },
        {
          rowIndex: 24,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.IMMEDIATE_SOURCE_ACQUISITION_NOTE,
          value: 'This is Immediate Source of Acquisition note',
        },
        {
          rowIndex: 25,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INFORMATION_ABOUT_DOCUMENTATION_NOTE,
          value: 'This is Information About Documentation note',
        },
        {
          rowIndex: 26,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INFORMATION_RELATED_COPYRIGHT_STATUS,
          value: 'This is Information related to Copyright Status note',
        },
        {
          rowIndex: 27,
          columnHeader: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ISSUING_BODY_NOTE,
          value: 'This is issuing Body note',
        },
        {
          rowIndex: 28,
          columnHeader: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LANGUAGE_NOTE,
          value: 'This is Language note',
        },
        {
          rowIndex: 29,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LINKING_ENTRY_COMPLEXITY_NOTE,
          value: 'This is Linking Entry Complexity note',
        },
        {
          rowIndex: 30,
          columnHeader: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LOCAL_NOTES,
          value: 'This is Local notes',
        },
        {
          rowIndex: 31,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LOCATION_ORIGINALS_DUPLICATES_NOTE,
          value: 'This is Location of Originals / Duplicates note',
        },
        {
          rowIndex: 32,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES
              .LOCATION_OTHER_ARCHIVAL_MATERIALS_NOTE,
          value: 'This is Location of Other Archival Materials note',
        },
        {
          rowIndex: 33,
          columnHeader: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.METHODOLOGY_NOTE,
          value: 'This is Methodology note',
        },
        {
          rowIndex: 34,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.NUMBERING_PECULIARITIES_NOTE,
          value: 'This is Numbering peculiarities note',
        },
        {
          rowIndex: 35,
          columnHeader: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ORIGINAL_VERSION_NOTE,
          value: 'This is Original Version note',
        },
        {
          rowIndex: 36,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.OWNERSHIP_CUSTODIAL_HISTORY_NOTE,
          value: 'This is Ownership and Custodial History note',
        },
        {
          rowIndex: 37,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PARTICIPANT_PERFORMER_NOTE,
          value: 'This is Participant or Performer note',
        },
        {
          rowIndex: 38,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES
              .PREFERRED_CITATION_DESCRIBED_MATERIALS_NOTE,
          value: 'This is Preferred Citation of Described Materials note',
        },
        {
          rowIndex: 39,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES
              .PUBLICATIONS_ABOUT_DESCRIBED_MATERIALS_NOTE,
          value: 'This is Publications About Described Materials note',
        },
        {
          rowIndex: 40,
          columnHeader: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
          value: 'This is Reproduction note',
        },
        {
          rowIndex: 41,
          columnHeader: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESTRICTIONS_ACCESS_NOTE,
          value: 'This is Restrictions on Access note',
        },
        {
          rowIndex: 42,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SCALE_NOTE_GRAPHIC_MATERIAL,
          value: 'This is Scale note for graphic material',
        },
        {
          rowIndex: 43,
          columnHeader: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE_DESCRIPTION_NOTE,
          value: 'This is Source of Description note',
        },
        {
          rowIndex: 44,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STUDY_PROGRAM_INFORMATION_NOTE,
          value: 'This is Study Program information note',
        },
        {
          rowIndex: 45,
          columnHeader: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUMMARY,
          value: 'This is Summary note',
        },
        {
          rowIndex: 46,
          columnHeader: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPLEMENT_NOTE,
          value: 'This is Supplement note',
        },
        {
          rowIndex: 47,
          columnHeader: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SYSTEM_DETAILS_NOTE,
          value: 'This is System Details note',
        },
        {
          rowIndex: 48,
          columnHeader: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.TARGET_AUDIENCE_NOTE,
          value: 'This is Target Audience note',
        },
        {
          rowIndex: 49,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES
              .TERMS_GOVERNING_USE_REPRODUCTION_NOTE,
          value: 'This is Terms Governing Use and Reproduction note',
        },
        {
          rowIndex: 50,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.TYPE_COMPUTER_FILE_DATA_NOTE,
          value: 'This is Type of computer file or data note',
        },
        {
          rowIndex: 51,
          columnHeader:
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.TYPE_REPORT_PERIOD_COVERED_NOTE,
          value: 'This is Type of report and Period covered note',
        },
        {
          rowIndex: 52,
          columnHeader: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.WITH_NOTE,
          value: 'This is With note',
        },
      ],
    };

    let instanceId;
    let instanceHrid;
    let user;

    before('Creating user and test data', () => {
      cy.getAdminToken();
      // Clean up any existing instances
      InventoryInstances.deleteInstanceByTitleViaApi('C934322*');
      // Import MARC bib
      DataImport.uploadFileViaApi(
        testData.marcFile.marc,
        testData.marcFile.fileName,
        testData.marcFile.jobProfileToRun,
      ).then((response) => {
        instanceHrid = response[0].instance.hrid;
        instanceId = response[0].instance.id;
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
        user = createdUserProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Deleting created user and test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(instanceId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C934322 Import MARC bib record with all Instance note types (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C934322'] },
      () => {
        // Step 3. Find and open detail view of imported Instance:
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        InstanceRecordView.verifyInstanceIsOpened(testData.instanceTitle);
        InstanceRecordView.waitLoading();
        testData.notes.forEach((note) => {
          InstanceRecordView.checkNotesByType(note.rowIndex, note.columnHeader, note.value);
        });
      },
    );
  });
});
