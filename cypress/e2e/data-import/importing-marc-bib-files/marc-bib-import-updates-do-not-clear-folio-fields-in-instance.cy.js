import {
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import InstanceStatusTypes from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';
import NatureOfContent from '../../../support/fragments/settings/inventory/instances/natureOfContent';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const randomPostfix = getRandomPostfix();

    const testData = {
      instanceTitle: `AT_C1292052_MarcBibInstance_${randomPostfix}`,
      parentInstanceTitle: `AT_C1292052_ParentInstance_${randomPostfix}`,
      childInstanceTitle: `AT_C1292052_ChildInstance_${randomPostfix}`,
      catalogedDate: DateTools.getFormattedDate({ date: new Date() }),
      instanceStatusTerm: INSTANCE_STATUS_TERM_NAMES.CATALOGED,
      statisticalCodeType: 'ARL (Collection stats)',
      statisticalCode: null,
      administrativeNote: `C1292052 admin note ${randomPostfix}`,
      natureOfContent: null,
      tagName: 'c1292052',
      exportedMarcFile: `C1292052_exportedMarcFile_${randomPostfix}.mrc`,
      modifiedMarcFile: `C1292052_modifiedMarcFile_${randomPostfix}.mrc`,
      uploadModifiedMarcFile: `C1292052_uploadMarcFile_${randomPostfix}.mrc`,
    };

    const marcBibFields = [
      {
        tag: '008',
        content: QuickMarcEditor.valid008ValuesInstance,
      },
      {
        tag: '245',
        content: `$a ${testData.instanceTitle}`,
        indicators: ['1', '\\'],
      },
    ];

    const mappingProfile = {
      name: `C1292052 Update MARC Bib by 999 match ff $s ${randomPostfix}`,
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
    };
    const actionProfile = {
      name: `C1292052 Update MARC Bib by 999 match ff $s ${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: 'MARC_BIBLIOGRAPHIC',
    };
    const matchProfile = {
      profileName: `C1292052 Update MARC Bib records by matching 999 value ${randomPostfix}`,
      incomingRecordFields: {
        field: '999',
        in1: 'f',
        in2: 'f',
        subfield: 's',
      },
      existingRecordFields: {
        field: '999',
        in1: 'f',
        in2: 'f',
        subfield: 's',
      },
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const jobProfile = {
      profileName: `C1292052 Update MARC Bib by 999 match ff $s ${randomPostfix}`,
    };

    let instanceId;
    let parentInstanceId;
    let parentInstanceHrid;
    let childInstanceId;
    let childInstanceHrid;

    before('Create test data', () => {
      cy.getAdminToken();

      NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile)
        .then((matchProfileResponse) => {
          matchProfile.id = matchProfileResponse.body.id;
        })
        .then(() => {
          NewFieldMappingProfile.createMappingProfileForUpdateMarcBibViaApi(mappingProfile).then(
            (mappingProfileResponse) => {
              mappingProfile.id = mappingProfileResponse.body.id;
            },
          );
        })
        .then(() => {
          NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfile.id).then(
            (actionProfileResponse) => {
              actionProfile.id = actionProfileResponse.body.id;
            },
          );
        })
        .then(() => {
          NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
            jobProfile.profileName,
            matchProfile.id,
            actionProfile.id,
          );
        });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.enableStaffSuppressFacet.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
          (createdInstanceId) => {
            instanceId = createdInstanceId;
          },
        );

        cy.then(() => {
          cy.getInstanceById(instanceId).then((instanceData) => {
            InstanceStatusTypes.getViaApi({
              query: `name=="${testData.instanceStatusTerm}"`,
            }).then((statuses) => {
              NatureOfContent.getFirstViaApi().then((natureOfContentTerm) => {
                testData.natureOfContent = natureOfContentTerm.name;
                cy.getStatisticalCodeTypes({
                  query: `name=="${testData.statisticalCodeType}"`,
                }).then((types) => {
                  cy.getStatisticalCodes({
                    query: `statisticalCodeTypeId=="${types[0].id}"`,
                  }).then((codes) => {
                    testData.statisticalCode = codes[0].name;
                    InventoryInstance.createInstanceViaApi({
                      instanceTitle: testData.parentInstanceTitle,
                    }).then(({ instanceData: parentData }) => {
                      parentInstanceId = parentData.instanceId;
                      cy.getInstanceById(parentInstanceId).then((parent) => {
                        parentInstanceHrid = parent.hrid;
                      });
                    });
                    InventoryInstance.createInstanceViaApi({
                      instanceTitle: testData.childInstanceTitle,
                    }).then(({ instanceData: childData }) => {
                      childInstanceId = childData.instanceId;
                      cy.getInstanceById(childInstanceId).then((child) => {
                        childInstanceHrid = child.hrid;
                      });
                    });
                    InventoryInstance.getInstanceRelationshipTypesViaApi().then(
                      (relationshipTypes) => {
                        const relationshipTypeId = relationshipTypes[0].id;
                        cy.updateInstance({
                          ...instanceData,
                          discoverySuppress: true,
                          staffSuppress: true,
                          previouslyHeld: true,
                          catalogedDate: testData.catalogedDate,
                          statusId: statuses[0].id,
                          statisticalCodeIds: [codes[0].id],
                          administrativeNotes: [testData.administrativeNote],
                          natureOfContentTermIds: [natureOfContentTerm.id],
                          tags: { tagList: [testData.tagName] },
                          parentInstances: [
                            {
                              superInstanceId: parentInstanceId,
                              instanceRelationshipTypeId: relationshipTypeId,
                            },
                          ],
                          childInstances: [
                            {
                              subInstanceId: childInstanceId,
                              instanceRelationshipTypeId: relationshipTypeId,
                            },
                          ],
                        });
                      },
                    );
                  });
                });
              });
            });
          });
        }).then(() => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          InventoryInstances.searchByTitle(instanceId);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      Users.deleteViaApi(testData.userProperties.userId);
      cy.getInstanceById(instanceId).then((instanceData) => {
        cy.updateInstance({
          ...instanceData,
          parentInstances: [],
          childInstances: [],
        });
      });
      InventoryInstance.deleteInstanceViaApi(instanceId);
      InventoryInstance.deleteInstanceViaApi(parentInstanceId);
      InventoryInstance.deleteInstanceViaApi(childInstanceId);
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
      FileManager.deleteFile(`cypress/fixtures/${testData.modifiedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.exportedMarcFile}`);
    });

    it(
      'C1292052 Verify that MARC bib record Data import updates do not clear FOLIO fields in Instance record (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C1292052'] },
      () => {
        // Step 1. Click Actions > Export instance (MARC) on the detail view pane
        cy.intercept('/data-export/quick-export').as('quickExport');
        InstanceRecordView.exportInstanceMarc();
        cy.wait('@quickExport', getLongDelay()).then((resp) => {
          const expectedRecordHrid = resp.response.body.jobExecutionHrId;

          // Step 2. Go to Data Export app, download exported .mrc file
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
          ExportFile.waitLandingPageOpened();
          ExportFile.downloadExportedMarcFileWithRecordHrid(
            expectedRecordHrid,
            testData.exportedMarcFile,
          );
          FileManager.deleteFileFromDownloadsByMask('QuickInstanceExport*');
        });

        // Steps 3-4. Open exported .mrc file, update $a of 245 field (add "Updated"), save
        DataImport.editMarcFile(
          testData.exportedMarcFile,
          testData.modifiedMarcFile,
          [testData.instanceTitle],
          [`${testData.instanceTitle} Updated`],
        );

        // Step 5. Go to Data Import, upload modified file with job profile and run import
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.uploadFile(testData.modifiedMarcFile, testData.uploadModifiedMarcFile);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(testData.uploadModifiedMarcFile);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);

        // Step 6. Click on the file name - verify "Updated" status in SRS MARC and Instance columns
        Logs.openFileDetails(testData.uploadModifiedMarcFile);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });

        // Step 7. Click on the "Updated" hyperlink → Instance detail view shown
        FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
        InventoryInstance.waitLoading();

        // Step 8. Verify FOLIO fields are NOT cleared
        InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryAndStaffSuppressedWarning();
        InstanceRecordView.verifyInstanceIsMarkedAsPreviouslyHeld();
        InstanceRecordView.verifyCatalogedDate(testData.catalogedDate);
        InstanceRecordView.verifyInstanceStatusTerm(testData.instanceStatusTerm);
        InstanceRecordView.verifyStatisticalCode(testData.statisticalCode);
        InstanceRecordView.verifyAdministrativeNote(testData.administrativeNote);
        InstanceRecordView.verifyNatureOfContent(testData.natureOfContent);
        InstanceRecordView.verifyParentInstanceTitle(testData.parentInstanceTitle);
        InstanceRecordView.verifyChildInstanceTitle(testData.childInstanceTitle);
        InventoryInstance.openTagsPane();
        InventoryInstance.checkTagSelectedInDropdown(testData.tagName);

        // Step 9. Click Actions > Edit - verify FOLIO fields are not cleared in edit pane
        InventoryInstance.editInstance();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.verifyDiscoverySuppressCheckbox(true);
        InstanceRecordEdit.verifyStaffSuppressCheckbox(true);
        InstanceRecordEdit.verifyPreviouslyHeldCheckbox(true);
        InstanceRecordEdit.verifyCatalogedDateField(testData.catalogedDate);
        InstanceRecordEdit.verifyInstanceStatusTermSelected(testData.instanceStatusTerm);
        InstanceRecordEdit.verifyStatisticalCodeSelected(testData.statisticalCode);
        InstanceRecordEdit.verifyAdministrativeNote(testData.administrativeNote);
        InstanceRecordEdit.verifyNatureOfContentSelected(testData.natureOfContent);
        InstanceRecordEdit.verifyParentInstance(testData.parentInstanceTitle, parentInstanceHrid);
        InstanceRecordEdit.verifyChildInstance(testData.childInstanceTitle, childInstanceHrid);
        InstanceRecordEdit.close();
      },
    );
  });
});
