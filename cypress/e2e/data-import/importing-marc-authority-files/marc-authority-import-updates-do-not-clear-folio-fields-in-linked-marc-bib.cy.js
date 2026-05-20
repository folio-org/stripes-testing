import {
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
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
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
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
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const randomPostfix = getRandomPostfix();
    const randomLetters = getRandomLetters(10);
    const randomDigits = randomNDigitNumber(8);

    const testData = {
      tag100: '100',
      tag700: '700',
      authorityHeading: `Stelfreeze, Brian ${randomPostfix}`,
      updatedAuthorityHeading: `$a Stelfreeze, Brian ${randomPostfix} UPDATED`,
      sprouseHeading: `Sprouse, Chris ${randomPostfix}`,
      searchOption: 'Keyword',
      calloutMessage:
        "is complete. The .csv downloaded contains selected records' UIIDs. To retrieve the .mrc file, please go to the Data export app.",
      instanceTitle: `AT_C1292050_MarcBibInstance_${randomPostfix}`,
      parentInstanceTitle: `AT_C1292050_ParentInstance_${randomPostfix}`,
      childInstanceTitle: `AT_C1292050_ChildInstance_${randomPostfix}`,
      catalogedDate: DateTools.getFormattedDate({ date: new Date() }),
      instanceStatusTerm: INSTANCE_STATUS_TERM_NAMES.CATALOGED,
      statisticalCodeType: 'ARL (Collection stats)',
      statisticalCode: null,
      administrativeNote: `C1292050 admin note ${randomPostfix}`,
      natureOfContent: null,
      csvFile: `C1292050_exportedCSVFile_${randomPostfix}.csv`,
      exportedMarcFile: `C1292050_exportedMarcFile_${randomPostfix}.mrc`,
      modifiedMarcFile: `C1292050_modifiedMarcFile_${randomPostfix}.mrc`,
      uploadModifiedMarcFile: `C1292050_uploadMarcFile_${randomPostfix}.mrc`,
    };

    const authData = {
      prefix: randomLetters,
      startWithNumber: `C1292050${randomDigits}`,
      get hrid() {
        return `${this.prefix}${this.startWithNumber}1`;
      },
    };

    const linkingTagAndValue = {
      bibFieldIndex: 5,
      value: `$a ${testData.authorityHeading} $e artist.`,
      tag: '700',
      authorityTag: '100',
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
      {
        tag: '700',
        content: `$a ${testData.authorityHeading} $e artist.`,
        indicators: ['1', '\\'],
      },
      {
        tag: '700',
        content: `$a ${testData.sprouseHeading} $e artist.`,
        indicators: ['1', '\\'],
      },
    ];

    const mappingProfile = {
      name: `C1292050 Update MARC authority records by matching 999 ff $s ${randomPostfix}`,
    };
    const actionProfile = {
      name: `C1292050 Update MARC authority records by matching 999 ff $s ${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: 'MARC_AUTHORITY',
    };
    const matchProfile = {
      profileName: `C1292050 Update MARC authority records by matching 999 ff $s ${randomPostfix}`,
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
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const jobProfile = {
      profileName: `C1292050 Update MARC authority records by matching 999 ff $s ${randomPostfix}`,
    };

    let instanceId;
    let parentInstanceId;
    let parentInstanceHrid;
    let childInstanceId;
    let childInstanceHrid;
    let authorityId;
    let authorityId2;

    before('Create test data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.authorityHeading);
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.sprouseHeading);

      NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(mappingProfile)
        .then((mappingProfileResponse) => {
          mappingProfile.id = mappingProfileResponse.body.id;
        })
        .then(() => {
          NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfile.id).then(
            (actionProfileResponse) => {
              actionProfile.id = actionProfileResponse.body.id;
            },
          );
        })
        .then(() => {
          NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile).then(
            (matchProfileResponse) => {
              matchProfile.id = matchProfileResponse.body.id;
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
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.then(() => {
          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
            (createdInstanceId) => {
              instanceId = createdInstanceId;
            },
          );

          MarcAuthorities.createMarcAuthorityViaAPI(
            authData.prefix,
            `${authData.startWithNumber}1`,
            [
              {
                tag: testData.tag100,
                content: `$a ${testData.authorityHeading}`,
                indicators: ['1', '\\'],
              },
            ],
          ).then((createdAuthorityId) => {
            authorityId = createdAuthorityId;
          });

          MarcAuthorities.createMarcAuthorityViaAPI(
            authData.prefix,
            `${authData.startWithNumber}2`,
            [
              {
                tag: testData.tag100,
                content: `$a ${testData.sprouseHeading}`,
                indicators: ['1', '\\'],
              },
            ],
          ).then((createdAuthorityId) => {
            authorityId2 = createdAuthorityId;
          });
        })
          .then(() => {
            QuickMarcEditor.linkMarcRecordsViaApi({
              bibId: instanceId,
              authorityIds: [authorityId, authorityId2],
              bibFieldTags: [testData.tag700, testData.tag700],
              authorityFieldTags: [testData.tag100, testData.tag100],
              finalBibFieldContents: [
                linkingTagAndValue.value,
                `$a ${testData.sprouseHeading} $e artist.`,
              ],
              bibFieldIndexes: [
                linkingTagAndValue.bibFieldIndex,
                linkingTagAndValue.bibFieldIndex + 1,
              ],
            });
          })
          .then(() => {
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
          })
          .then(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
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
        MarcAuthority.deleteViaAPI(authorityId, true);
        MarcAuthority.deleteViaAPI(authorityId2, true);
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        FileManager.deleteFile(`cypress/fixtures/${testData.modifiedMarcFile}`);
        FileManager.deleteFile(`cypress/fixtures/${testData.exportedMarcFile}`);
        FileManager.deleteFile(`cypress/fixtures/${testData.csvFile}`);
      });
    });

    it(
      'C1292050 Verify that MARC authority record data import updates do not clear FOLIO fields in linked MARC bib records (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C1292050'] },
      () => {
        // Step 1. Click Actions - Export (MARC) on the MARC authority record detail pane
        MarcAuthoritiesSearch.searchBy(testData.searchOption, testData.authorityHeading);
        MarcAuthorities.selectAllRecords();
        MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('1 record selected');
        MarcAuthorities.exportSelected();
        cy.wait(1000);
        MarcAuthorities.checkCallout(testData.calloutMessage);
        ExportFile.downloadCSVFile(testData.csvFile, 'QuickAuthorityExport*');
        MarcAuthorities.verifyAllCheckboxesAreUnchecked();
        MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('1 record found');

        // Step 2. Go to Data Export and download generated .mrc file
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        ExportFile.uploadFile(testData.csvFile);
        ExportFile.exportWithDefaultJobProfile(
          testData.csvFile,
          'Default authority',
          'Authorities',
        );
        ExportFile.downloadExportedMarcFile(testData.exportedMarcFile);

        // Steps 3-4. Open exported .mrc, update $a of 1XX field by adding "UPDATED", save the file
        DataImport.editMarcFile(
          testData.exportedMarcFile,
          testData.modifiedMarcFile,
          [testData.authorityHeading],
          [`${testData.authorityHeading} UPDATED`],
        );

        // Step 5. Go to Data Import, upload modified file with the update job profile and run import
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.uploadFile(testData.modifiedMarcFile, testData.uploadModifiedMarcFile);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(testData.uploadModifiedMarcFile);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);

        // Step 6. Click on the file name - verify "Updated" status in SRS MARC and Authority columns
        Logs.openFileDetails(testData.uploadModifiedMarcFile);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.authority,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });

        // Step 7. Go to MARC authority app and find the updated record by new heading
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthoritiesSearch.searchBy(
          testData.searchOption,
          `${testData.authorityHeading} UPDATED`,
        );
        MarcAuthorities.selectTitle(`${testData.authorityHeading} UPDATED`);

        // Step 8. Go to Inventory, open the linked instance - verify FOLIO fields are not cleared
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryAndStaffSuppressedWarning();
        InstanceRecordView.verifyInstanceIsMarkedAsPreviouslyHeld();
        InstanceRecordView.verifyCatalogedDate(testData.catalogedDate);
        InstanceRecordView.verifyInstanceStatusTerm(testData.instanceStatusTerm);
        InstanceRecordView.verifyStatisticalCode(testData.statisticalCode);
        InstanceRecordView.verifyAdministrativeNote(testData.administrativeNote);
        InstanceRecordView.verifyNatureOfContent(testData.natureOfContent);
        InstanceRecordView.verifyParentInstanceTitle(testData.parentInstanceTitle);
        InstanceRecordView.verifyChildInstanceTitle(testData.childInstanceTitle);

        // Step 9. Click Actions - Edit MARC bibliographic record - verify linked field is updated
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.verifyTagFieldAfterLinking(
          linkingTagAndValue.bibFieldIndex,
          linkingTagAndValue.tag,
          '1',
          '\\',
          testData.updatedAuthorityHeading,
          '$e artist.',
          `$0 ${authData.hrid}`,
          '',
        );

        // Step 10. Close QuickMARC pane, click Actions - Edit - verify FOLIO fields are not cleared
        QuickMarcEditor.closeWithoutSaving();
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
