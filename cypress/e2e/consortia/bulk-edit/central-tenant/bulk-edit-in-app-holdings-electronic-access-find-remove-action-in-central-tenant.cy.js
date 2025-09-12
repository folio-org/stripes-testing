import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  getReasonForTenantNotAssociatedError,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import UrlRelationship from '../../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import UrlRelationshipConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/instances-holdings-items/urlRelationshipConsortiumManager';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
let instanceTypeId;
let collegeLocationId;
let universityLocationId;
let sourceId;
let sharedUrlRelationshipData;
const collegeHoldingIds = [];
const collegeHoldingHrids = [];
const universityHoldingIds = [];
const universityHoldingHrids = [];
const userPermissions = [
  permissions.bulkEditEdit.gui,
  permissions.uiInventoryViewCreateEditHoldings.gui,
];
const folioInstance = {
  title: `AT_C554640_FolioInstance_${getRandomPostfix()}`,
};
const marcInstance = {
  title: `AT_C554640_MarcInstance_${getRandomPostfix()}`,
};
const sharedUrlRelationship = {
  payload: {
    name: `AT_C554640 shared urlRelationship ${getRandomPostfix()}`,
  },
};
const localUrlRelationship = {
  name: `AT_C554640 local urlRelationship ${getRandomPostfix()}`,
};
const localUrlRelationshipNameWithAffiliation = `${localUrlRelationship.name} (${Affiliations.College})`;
const electronicAccessFields = {
  uri: 'https://www.testuri.com/uri',
  linkText: 'te;st: [sample] li*nk$text',
  materialsSpecification: 'test materials specified',
  publicNote: 'url public note',
};
const instances = [folioInstance, marcInstance];
const electronicAccessTableHeaders =
  'URL relationshipURILink textMaterials specifiedURL public note';
const electronicAccessTableHeadersInFile =
  'URL relationship;URI;Link text;Materials specified;URL public note\n';
const holdingUUIDsFileName = `holdingUUIdsFileName_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(holdingUUIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(holdingUUIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(holdingUUIDsFileName);
const errorsFromCommittingFileName =
  BulkEditFiles.getErrorsFromCommittingFileName(holdingUUIDsFileName);
const getRowsInCsvFileMatchingHrids = (csvFileData, hrids) => {
  return csvFileData.filter((row) => {
    return hrids.some((hrid) => {
      return row[BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID].includes(hrid);
    });
  });
};
const verifyElectronicAccessFieldsInCSVFile = (
  fileName,
  electronicAccessFieldValueInCollege,
  electronicAccessFieldValueInUniversity,
) => {
  FileManager.convertCsvToJson(fileName).then((csvFileData) => {
    const collegeHoldingRows = getRowsInCsvFileMatchingHrids(csvFileData, collegeHoldingHrids);
    const universityHoldingRows = getRowsInCsvFileMatchingHrids(
      csvFileData,
      universityHoldingHrids,
    );

    collegeHoldingRows.forEach((collegeRow) => {
      cy.expect(
        collegeRow[BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS],
      ).to.equal(electronicAccessFieldValueInCollege);
    });
    universityHoldingRows.forEach((universityRow) => {
      cy.expect(
        universityRow[BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS],
      ).to.equal(electronicAccessFieldValueInUniversity);
    });
  });
};

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser(userPermissions).then((userProperties) => {
          user = userProperties;

          [Affiliations.College, Affiliations.University].forEach((affiliation) => {
            cy.affiliateUserToTenant({
              tenantId: affiliation,
              userId: user.userId,
              permissions: userPermissions,
            });
          });

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            sourceId = folioSource.id;
          });
          UrlRelationshipConsortiumManager.createViaApi(sharedUrlRelationship)
            .then((newUrlRelationship) => {
              sharedUrlRelationshipData = newUrlRelationship;
            })
            .then(() => {
              // create shared folio instance
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstance.title,
                },
              }).then((createdInstanceData) => {
                folioInstance.id = createdInstanceData.instanceId;
              });
            })
            .then(() => {
              // create shared marc instance
              cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                marcInstance.id = instanceId;
              });
            })
            .then(() => {
              cy.withinTenant(Affiliations.College, () => {
                cy.getLocations({ limit: 1 }).then((res) => {
                  collegeLocationId = res.id;

                  // create local url relationship in College tenant
                  UrlRelationship.createViaApi({
                    name: localUrlRelationship.name,
                    source: 'local',
                  }).then((response) => {
                    localUrlRelationship.id = response.id;

                    // create holdings in College tenant
                    instances.forEach((instance) => {
                      InventoryHoldings.createHoldingRecordViaApi({
                        instanceId: instance.id,
                        permanentLocationId: collegeLocationId,
                        electronicAccess: [
                          {
                            ...electronicAccessFields,
                            relationshipId: sharedUrlRelationship.settingId,
                          },
                          {
                            ...electronicAccessFields,
                            relationshipId: localUrlRelationship.id,
                          },
                        ],
                        sourceId,
                      }).then((holding) => {
                        collegeHoldingIds.push(holding.id);
                        collegeHoldingHrids.push(holding.hrid);
                      });
                      cy.wait(1000);
                    });
                  });
                });
              });
            })
            .then(() => {
              cy.withinTenant(Affiliations.University, () => {
                // create holdings in University tenant
                cy.getLocations({ limit: 1 }).then((res) => {
                  universityLocationId = res.id;

                  instances.forEach((instance) => {
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: instance.id,
                      permanentLocationId: universityLocationId,
                      electronicAccess: [
                        {
                          ...electronicAccessFields,
                          relationshipId: sharedUrlRelationship.settingId,
                        },
                      ],
                      sourceId,
                    }).then((holding) => {
                      universityHoldingIds.push(holding.id);
                      universityHoldingHrids.push(holding.hrid);
                    });
                    cy.wait(1000);
                  });
                });
              });
            })
            .then(() => {
              FileManager.createFile(
                `cypress/fixtures/${holdingUUIDsFileName}`,
                `${collegeHoldingIds.join('\n')}\n${universityHoldingIds.join('\n')}`,
              );
            });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.withinTenant(Affiliations.College, () => {
          UrlRelationship.deleteViaApi(localUrlRelationship.id);

          collegeHoldingIds.forEach((collegeHoldingId) => {
            cy.deleteHoldingRecordViaApi(collegeHoldingId);
          });
        });

        cy.withinTenant(Affiliations.University, () => {
          universityHoldingIds.forEach((universityHoldingId) => {
            cy.deleteHoldingRecordViaApi(universityHoldingId);
          });
        });

        instances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });

        UrlRelationshipConsortiumManager.deleteViaApi(sharedUrlRelationshipData);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileName,
          previewFileName,
          changedRecordsFileName,
          errorsFromCommittingFileName,
        );
      });

      it(
        'C554640 Verify "Find & remove" action for Holdings electronic access in Central tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C554640'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
          BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
          BulkEditSearchPane.verifyPaneTitleFileName(holdingUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('4 holdings');
          BulkEditSearchPane.verifyFileNameHeadLine(holdingUUIDsFileName);

          const holdingHrids = [...collegeHoldingHrids, ...universityHoldingHrids];

          holdingHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              holdingHrid,
            );
          });

          BulkEditSearchPane.verifyPreviousPaginationButtonDisabled();
          BulkEditSearchPane.verifyNextPaginationButtonDisabled();
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            true,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
          );

          const holdingElectronicAccessFieldsInCollege = `${electronicAccessTableHeaders}${sharedUrlRelationship.payload.name}${electronicAccessFields.uri}${electronicAccessFields.linkText}${electronicAccessFields.materialsSpecification}${electronicAccessFields.publicNote}${localUrlRelationship.name}${electronicAccessFields.uri}${electronicAccessFields.linkText}${electronicAccessFields.materialsSpecification}${electronicAccessFields.publicNote}`;
          const holdingElectronicAccessFieldsInUniversity = `${electronicAccessTableHeaders}${sharedUrlRelationship.payload.name}${electronicAccessFields.uri}${electronicAccessFields.linkText}${electronicAccessFields.materialsSpecification}${electronicAccessFields.publicNote}`;

          universityHoldingHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
              holdingElectronicAccessFieldsInUniversity,
            );
          });
          collegeHoldingHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
              holdingElectronicAccessFieldsInCollege,
            );
          });

          BulkEditSearchPane.changeShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            false,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
          );
          BulkEditSearchPane.verifyResultColumnTitlesDoNotIncludeTitles(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
          );
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          const holdingElectronicAccessFieldsInCollegeInFile = `${electronicAccessTableHeadersInFile}${sharedUrlRelationship.payload.name};${electronicAccessFields.uri};${electronicAccessFields.linkText};${electronicAccessFields.materialsSpecification};${electronicAccessFields.publicNote}|${localUrlRelationship.name};${electronicAccessFields.uri};${electronicAccessFields.linkText};${electronicAccessFields.materialsSpecification};${electronicAccessFields.publicNote}`;
          const holdingElectronicAccessFieldsInUniversityInFile = `${electronicAccessTableHeadersInFile}${sharedUrlRelationship.payload.name};${electronicAccessFields.uri};${electronicAccessFields.linkText};${electronicAccessFields.materialsSpecification};${electronicAccessFields.publicNote}`;

          verifyElectronicAccessFieldsInCSVFile(
            matchedRecordsFileName,
            holdingElectronicAccessFieldsInCollegeInFile,
            holdingElectronicAccessFieldsInUniversityInFile,
          );
          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);
          BulkEditActions.selectOption('URL relationship');
          BulkEditActions.selectSecondAction('Find (full field search)');
          BulkEditActions.checkTypeExists(localUrlRelationshipNameWithAffiliation);
          BulkEditActions.checkTypeExists(sharedUrlRelationship.payload.name);
          BulkEditActions.selectFromUnchangedSelect(localUrlRelationshipNameWithAffiliation);
          BulkEditActions.selectSecondAction('Remove');
          BulkEditActions.verifyConfirmButtonDisabled(false);

          const bulkEditFilters = [
            { option: 'URI', action: 'Find', value: electronicAccessFields.uri },
            { option: 'Link text', action: 'Find', value: electronicAccessFields.linkText },
            {
              option: 'Materials specified',
              action: 'Find',
              value: electronicAccessFields.materialsSpecification,
            },
            { option: 'URL public note', action: 'Find', value: electronicAccessFields.publicNote },
          ];

          bulkEditFilters.forEach((filter, index) => {
            const rowIndex = index + 1;

            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.verifyNewBulkEditRow(rowIndex);
            BulkEditActions.selectOption(filter.option, rowIndex);
            BulkEditActions.selectSecondAction(filter.action, rowIndex);
            BulkEditActions.fillInFirstTextArea(filter.value, rowIndex);
            BulkEditActions.selectSecondAction('Remove', rowIndex);
            BulkEditActions.verifyConfirmButtonDisabled(false);
          });

          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(4);

          const editedHoldingElectronicAccessFields = `${electronicAccessTableHeaders}${sharedUrlRelationship.payload.name}`;

          holdingHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
              editedHoldingElectronicAccessFields,
            );
          });

          BulkEditActions.verifyAreYouSureForm(4);
          BulkEditSearchPane.verifyPreviousPaginationButtonInAreYouSureFormDisabled();
          BulkEditSearchPane.verifyNextPaginationButtonInAreYouSureFormDisabled();
          BulkEditActions.downloadPreview();

          const editedHoldingElectronicAccessFieldsInCollegeInFile = `${electronicAccessTableHeadersInFile}${sharedUrlRelationship.payload.name};;;;|;;;;`;
          const editedHoldingElectronicAccessFieldsInUniversityInFile = `${electronicAccessTableHeadersInFile}${sharedUrlRelationship.payload.name};;;;`;

          verifyElectronicAccessFieldsInCSVFile(
            previewFileName,
            editedHoldingElectronicAccessFieldsInCollegeInFile,
            editedHoldingElectronicAccessFieldsInUniversityInFile,
          );
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(4);

          holdingHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
              editedHoldingElectronicAccessFields,
            );
          });

          BulkEditSearchPane.verifyErrorLabel(2);

          universityHoldingIds.forEach((universityHoldingId) => {
            BulkEditSearchPane.verifyErrorByIdentifier(
              universityHoldingId,
              getReasonForTenantNotAssociatedError(
                universityHoldingId,
                Affiliations.University,
                'URL relationship',
              ),
            );
          });

          BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
          BulkEditSearchPane.verifyPaginatorInChangedRecords(4);
          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(2);
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          verifyElectronicAccessFieldsInCSVFile(
            changedRecordsFileName,
            editedHoldingElectronicAccessFieldsInCollegeInFile,
            editedHoldingElectronicAccessFieldsInUniversityInFile,
          );
          BulkEditActions.downloadErrors();

          universityHoldingIds.forEach((universityHoldingId) => {
            ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
              `ERROR,${universityHoldingId},${getReasonForTenantNotAssociatedError(
                universityHoldingId,
                Affiliations.University,
                'URL relationship',
              )}`,
            ]);
          });

          BulkEditFiles.verifyCSVFileRecordsNumber(errorsFromCommittingFileName, 2);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

          const electronicAccessFieldValuesToValidate = [
            sharedUrlRelationship.payload.name,
            '-',
            '-',
            '-',
            '-',
          ];

          collegeHoldingHrids.forEach((collegeHoldingHrid) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.searchHoldingsByHRID(collegeHoldingHrid);
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.waitLoading();

            const removedCollegeElectronicAccesFieldValues = ['-', '-', '-', '-', '-'];

            electronicAccessFieldValuesToValidate.forEach((field, ind) => {
              HoldingsRecordView.verifyElectronicAccessByElementIndex(ind, field);
            });
            removedCollegeElectronicAccesFieldValues.forEach((field, ind) => {
              HoldingsRecordView.verifyElectronicAccessByElementIndex(ind, field, 1);
            });
          });

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);

          universityHoldingHrids.forEach((universityHoldingHrid) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.searchHoldingsByHRID(universityHoldingHrid);
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.waitLoading();

            electronicAccessFieldValuesToValidate.forEach((field, ind) => {
              HoldingsRecordView.verifyElectronicAccessByElementIndex(ind, field);
            });
          });
        },
      );
    });
  });
});
