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
let locationId;
let sourceId;
let sharedUrlRelationshipData;
const collegeHoldingIds = [];
const collegeHoldingHrids = [];
const universityHoldingIds = [];
const universityHoldingHrids = [];
const folioInstance = {
  title: `AT_C494356_FolioInstance_${getRandomPostfix()}`,
};
const marcInstance = {
  title: `AT_C494356_MarcInstance_${getRandomPostfix()}`,
};
const sharedUrlRelationship = {
  payload: {
    name: `AT_C494356 shared urlRelationship ${getRandomPostfix()}`,
  },
};
const localUrlRelationship = {
  name: `AT_C494356 local urlRelationship ${getRandomPostfix()}`,
};
const localUrlRelationshipNameWithAffiliation = `${localUrlRelationship.name} (${Affiliations.College})`;
const electronicAccessFieldsFromUpperCase = {
  uri: 'HTTPS://www.testuri.com/uri',
  linkText: 'Te;st: [sample] li*nk$text',
  materialsSpecification: 'Test materials specified',
  publicNote: 'URL public note',
};
const electronicAccessFieldsFromLowerCase = {
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

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditHoldings.gui,
        ]).then((userProperties) => {
          user = userProperties;

          [Affiliations.College, Affiliations.University].forEach((affiliation) => {
            cy.assignAffiliationToUser(affiliation, user.userId);
            cy.setTenant(affiliation);
            cy.assignPermissionsToExistingUser(user.userId, [
              permissions.bulkEditEdit.gui,
              permissions.uiInventoryViewCreateEditHoldings.gui,
            ]);
            cy.resetTenant();
          });

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          cy.getLocations({ query: 'name="DCB"' }).then((res) => {
            locationId = res.id;
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
              cy.setTenant(Affiliations.College);
              // create local url relationship in College
              UrlRelationship.createViaApi({
                name: localUrlRelationship.name,
                source: 'local',
              }).then((response) => {
                localUrlRelationship.id = response.id;
              });
              // create holdings in College tenant
              instances.forEach((instance) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instance.id,
                  permanentLocationId: locationId,
                  electronicAccess: [
                    {
                      ...electronicAccessFieldsFromUpperCase,
                      relationshipId: sharedUrlRelationship.settingId,
                    },
                    {
                      ...electronicAccessFieldsFromLowerCase,
                      relationshipId: sharedUrlRelationship.settingId,
                    },
                  ],
                  sourceId,
                }).then((holding) => {
                  collegeHoldingIds.push(holding.id);
                  collegeHoldingHrids.push(holding.hrid);
                });
                cy.wait(1000);
              });
            })
            .then(() => {
              // create holdings in University tenant
              cy.setTenant(Affiliations.University);

              instances.forEach((instance) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instance.id,
                  permanentLocationId: locationId,
                  electronicAccess: [
                    {
                      ...electronicAccessFieldsFromUpperCase,
                      relationshipId: sharedUrlRelationship.settingId,
                    },
                    {
                      ...electronicAccessFieldsFromLowerCase,
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
            })
            .then(() => {
              FileManager.createFile(
                `cypress/fixtures/${holdingUUIDsFileName}`,
                `${collegeHoldingIds.join('\n')}\n${universityHoldingIds.join('\n')}`,
              );
            });
          cy.resetTenant();
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
        cy.setTenant(Affiliations.College);
        UrlRelationship.deleteViaApi(localUrlRelationship.id);

        collegeHoldingIds.forEach((collegeHoldingId) => {
          cy.deleteHoldingRecordViaApi(collegeHoldingId);
        });

        cy.setTenant(Affiliations.University);

        universityHoldingIds.forEach((universityHoldingId) => {
          cy.deleteHoldingRecordViaApi(universityHoldingId);
        });

        cy.resetTenant();
        cy.getAdminToken();

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
        'C494356 Verify "Find & replace" action for Holdings electronic access in Central tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C494356'] },
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

          const electronicAccessFieldsFromUpperCaseToString = Object.values(
            electronicAccessFieldsFromUpperCase,
          ).join('');
          const electronicAccessFieldsFromLowerCaseToString = Object.values(
            electronicAccessFieldsFromLowerCase,
          ).join('');

          const holdingElectronicAccessFields = `${electronicAccessTableHeaders}${sharedUrlRelationship.payload.name}${electronicAccessFieldsFromUpperCaseToString}${sharedUrlRelationship.payload.name}${electronicAccessFieldsFromLowerCaseToString}`;

          holdingHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
              holdingElectronicAccessFields,
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

          const electronicAccessFieldsFromUpperCaseToStringInFile = Object.values(
            electronicAccessFieldsFromUpperCase,
          ).join(';');
          const electronicAccessFieldsFromLowerCaseToStringInFile = Object.values(
            electronicAccessFieldsFromLowerCase,
          ).join(';');
          const holdingElectronicAccessFieldsInFile = `${electronicAccessTableHeadersInFile}${sharedUrlRelationship.payload.name};${electronicAccessFieldsFromUpperCaseToStringInFile}|${sharedUrlRelationship.payload.name};${electronicAccessFieldsFromLowerCaseToStringInFile}`;

          FileManager.convertCsvToJson(matchedRecordsFileName).then((csvFileData) => {
            csvFileData.forEach((row) => {
              cy.expect(
                row[BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS],
              ).to.equal(holdingElectronicAccessFieldsInFile);
            });
          });

          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);
          BulkEditActions.selectOption('URL relationship');
          BulkEditActions.selectSecondAction('Find (full field search)');
          BulkEditActions.checkTypeExists(localUrlRelationshipNameWithAffiliation);
          BulkEditActions.selectFromUnchangedSelect(sharedUrlRelationship.payload.name);
          BulkEditActions.selectSecondAction('Replace with');
          BulkEditActions.checkTypeNotExist(sharedUrlRelationship.payload.name, 0, 1);
          BulkEditActions.selectFromUnchangedSelect(localUrlRelationshipNameWithAffiliation);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);
          BulkEditActions.noteReplaceWith('URI', 'HTTPS', 'https', 1);

          const options = ['Remove', 'Replace with'];

          BulkEditActions.verifyTheSecondActionOptions(options);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(2);
          BulkEditActions.noteReplaceWith('Link text', 'Te;st:', 'te;st:', 2);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(3);
          BulkEditActions.noteReplaceWith('Materials specified', 'Test', 'test', 3);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(4);
          BulkEditActions.noteReplaceWith('URL public note', 'URL', 'url', 4);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(4);

          const holdingElectronicAccessFieldsToEdit = `${electronicAccessTableHeaders}${localUrlRelationship.name}${electronicAccessFieldsFromLowerCaseToString}${localUrlRelationship.name}${electronicAccessFieldsFromLowerCaseToString}`;

          holdingHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
              holdingElectronicAccessFieldsToEdit,
            );
          });

          BulkEditActions.verifyAreYouSureForm(4);
          BulkEditSearchPane.verifyPreviousPaginationButtonInAreYouSureFormDisabled();
          BulkEditSearchPane.verifyNextPaginationButtonInAreYouSureFormDisabled();
          BulkEditActions.downloadPreview();

          const holdingElectronicAccessFieldsToEditInFile = `${electronicAccessTableHeadersInFile}${localUrlRelationship.name};${electronicAccessFieldsFromLowerCaseToStringInFile}|${localUrlRelationship.name};${electronicAccessFieldsFromLowerCaseToStringInFile}`;

          FileManager.convertCsvToJson(previewFileName).then((csvFileData) => {
            csvFileData.forEach((row) => {
              cy.expect(row).to.have.property(
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
                holdingElectronicAccessFieldsToEditInFile,
              );
            });
          });

          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(4);

          const editedElectronicAccessFieldsInCollege = `${electronicAccessTableHeaders}${localUrlRelationship.name}${electronicAccessFieldsFromLowerCaseToString}${localUrlRelationship.name}${electronicAccessFieldsFromLowerCaseToString}`;
          const editedElectronicAccessFieldsInUniversity = `${electronicAccessTableHeaders}${sharedUrlRelationship.payload.name}${electronicAccessFieldsFromLowerCaseToString}${sharedUrlRelationship.payload.name}${electronicAccessFieldsFromLowerCaseToString}`;

          collegeHoldingHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
              editedElectronicAccessFieldsInCollege,
            );
          });
          universityHoldingHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
              editedElectronicAccessFieldsInUniversity,
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

          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          const holdingElectronicAccessFieldsEditedInCollegeInFile = `${electronicAccessTableHeadersInFile}${localUrlRelationship.name};${electronicAccessFieldsFromLowerCaseToStringInFile}|${localUrlRelationship.name};${electronicAccessFieldsFromLowerCaseToStringInFile}`;
          const holdingElectronicAccessFieldsEditedInUniversityInFile = `${electronicAccessTableHeadersInFile}${sharedUrlRelationship.payload.name};${electronicAccessFieldsFromLowerCaseToStringInFile}|${sharedUrlRelationship.payload.name};${electronicAccessFieldsFromLowerCaseToStringInFile}`;

          FileManager.convertCsvToJson(changedRecordsFileName).then((csvFileData) => {
            const collegeHoldingRows = getRowsInCsvFileMatchingHrids(
              csvFileData,
              collegeHoldingHrids,
            );
            const universityHoldingRows = getRowsInCsvFileMatchingHrids(
              csvFileData,
              universityHoldingHrids,
            );

            collegeHoldingRows.forEach((collegeRow) => {
              cy.expect(
                collegeRow[BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS],
              ).to.equal(holdingElectronicAccessFieldsEditedInCollegeInFile);
            });
            universityHoldingRows.forEach((universityRow) => {
              cy.expect(
                universityRow[BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS],
              ).to.equal(holdingElectronicAccessFieldsEditedInUniversityInFile);
            });
          });

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

          collegeHoldingHrids.forEach((collegeHoldingHrid) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.searchHoldingsByHRID(collegeHoldingHrid);
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.waitLoading();

            const electronicAccessFieldsToValidateInCollege = [
              localUrlRelationship.name,
              electronicAccessFieldsFromLowerCase.uri,
              electronicAccessFieldsFromLowerCase.linkText,
              electronicAccessFieldsFromLowerCase.materialsSpecification,
              electronicAccessFieldsFromLowerCase.publicNote,
            ];

            electronicAccessFieldsToValidateInCollege.forEach((field, ind) => {
              HoldingsRecordView.verifyElectronicAccessByElementIndex(ind, field);
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

            const electronicAccessFieldsToValidateInUniversity = [
              sharedUrlRelationship.payload.name,
              electronicAccessFieldsFromLowerCase.uri,
              electronicAccessFieldsFromLowerCase.linkText,
              electronicAccessFieldsFromLowerCase.materialsSpecification,
              electronicAccessFieldsFromLowerCase.publicNote,
            ];

            electronicAccessFieldsToValidateInUniversity.forEach((field, ind) => {
              HoldingsRecordView.verifyElectronicAccessByElementIndex(ind, field);
              HoldingsRecordView.verifyElectronicAccessByElementIndex(ind, field, 1);
            });
          });
        },
      );
    });
  });
});
