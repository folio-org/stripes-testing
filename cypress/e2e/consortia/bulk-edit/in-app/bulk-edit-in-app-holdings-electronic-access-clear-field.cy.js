import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
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
  title: `C494101 folio instance testBulkEdit_${getRandomPostfix()}`,
};
const marcInstance = {
  title: `C494101 marc instance testBulkEdit_${getRandomPostfix()}`,
};
const sharedUrlRelationship = {
  payload: {
    name: `C494101 shared urlRelationship ${getRandomPostfix()}`,
  },
};
const localUrlRelationship = {
  name: `C494101 local urlRelationship ${getRandomPostfix()}`,
};
const instances = [folioInstance, marcInstance];
const electronicAccessTableHeaders = 'RelationshipURILink textMaterials specifiedPublic note';
const electronicAccessTableHeadersInFile =
  'URL relationship;URI;Link text;Materials specified;URL public note\n';
const holdingUUIDsFileName = `holdingUUIdsFileName_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*-Matched-Records-${holdingUUIDsFileName}`;
const previewFileName = `*-Updates-Preview-${holdingUUIDsFileName}`;
const changedRecordsFileName = `*-Changed-Records-${holdingUUIDsFileName}`;
const errorsFromCommittingFileName = `*-Committing-changes-Errors-${holdingUUIDsFileName}`;
const getRowsInCsvFileMatchingHrids = (csvFileData, hrids) => {
  return csvFileData.filter((row) => {
    return hrids.some((hrid) => {
      return row[BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID].includes(hrid);
    });
  });
};

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditHoldings.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditHoldings.gui,
          ]);

          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditHoldings.gui,
          ]);

          cy.resetTenant();
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

                // create holdings in College tenant
                instances.forEach((instance) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: instance.id,
                    permanentLocationId: locationId,
                    electronicAccess: [
                      {
                        linkText: 'College shared link text',
                        materialsSpecification: 'College shared materials specified',
                        publicNote: 'College shared url public note',
                        uri: 'https://college-shared-uri.com',
                        relationshipId: sharedUrlRelationship.settingId,
                      },
                      {
                        linkText: 'College link text',
                        materialsSpecification: 'College materials specified',
                        publicNote: 'College url public note',
                        uri: 'https://college-uri.com',
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
                      linkText: 'University shared link text',
                      materialsSpecification: 'University shared materials specified',
                      publicNote: 'University shared url public note',
                      uri: 'https://university-shared-uri.com',
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
        'C494101 Verify "Clear field" action for Holdings electronic access in Central tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C494101'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
          BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
          BulkEditSearchPane.verifyPaneTitleFileName(holdingUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount(4);
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

          const collegeHoldingsElectronicAccess = `${electronicAccessTableHeaders}${sharedUrlRelationship.payload.name}https://college-shared-uri.comCollege shared link textCollege shared materials specifiedCollege shared url public note${localUrlRelationship.name}https://college-uri.comCollege link textCollege materials specifiedCollege url public note`;
          const universityHoldingsElectronicAccess = `${electronicAccessTableHeaders}${sharedUrlRelationship.payload.name}https://university-shared-uri.comUniversity shared link textUniversity shared materials specifiedUniversity shared url public note`;

          collegeHoldingHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
              collegeHoldingsElectronicAccess,
            );
          });
          universityHoldingHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
              universityHoldingsElectronicAccess,
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

          const collegeHoldingsElectronicAccessInFile = `${electronicAccessTableHeadersInFile}${sharedUrlRelationship.payload.name};https://college-shared-uri.com;College shared link text;College shared materials specified;College shared url public note|${localUrlRelationship.name};https://college-uri.com;College link text;College materials specified;College url public note`;
          const universityHoldingsElectronicAccessInFile = `${electronicAccessTableHeadersInFile}${sharedUrlRelationship.payload.name};https://university-shared-uri.com;University shared link text;University shared materials specified;University shared url public note`;

          FileManager.convertCsvToJson(matchedRecordsFileName).then((csvFileData) => {
            const collegeHoldingRows = getRowsInCsvFileMatchingHrids(
              csvFileData,
              collegeHoldingHrids,
            );
            const universityHoldingRows = getRowsInCsvFileMatchingHrids(
              csvFileData,
              universityHoldingHrids,
            );

            collegeHoldingRows.forEach((collegeHoldingRow) => {
              cy.expect(
                collegeHoldingRow[
                  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS
                ],
              ).to.equal(collegeHoldingsElectronicAccessInFile);
            });
            universityHoldingRows.forEach((universityHoldingRow) => {
              cy.expect(
                universityHoldingRow[
                  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS
                ],
              ).to.equal(universityHoldingsElectronicAccessInFile);
            });
          });

          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditSearchPane.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditSearchPane.isConfirmButtonDisabled(true);

          const fieldsToClear = ['URL Relationship', 'URI', 'Link text', 'Materials specified'];

          fieldsToClear.forEach((field, rowIndex) => {
            BulkEditActions.selectOption(field, rowIndex);
            BulkEditActions.selectSecondAction('Clear field', rowIndex);
            BulkEditSearchPane.isConfirmButtonDisabled(false);
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.verifyNewBulkEditRow(rowIndex + 1);
          });

          BulkEditActions.selectOption('URL public note', 4);
          BulkEditActions.selectSecondAction('Clear field', 4);
          BulkEditSearchPane.isConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(4);

          const updatedHoldingsElectronicAccess = electronicAccessTableHeaders;
          const updatedHoldingsCollegeElectronicAccessInFile = `${electronicAccessTableHeadersInFile};;;;|;;;;`;
          const updatedHoldingsUniversityElectronicAccessInFile = `${electronicAccessTableHeadersInFile};;;;`;

          holdingHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
              updatedHoldingsElectronicAccess,
            );
          });

          BulkEditActions.verifyAreYouSureForm(4);
          BulkEditSearchPane.verifyPreviousPaginationButtonInAreYouSureFormDisabled();
          BulkEditSearchPane.verifyNextPaginationButtonInAreYouSureFormDisabled();
          BulkEditActions.downloadPreview();

          FileManager.convertCsvToJson(previewFileName).then((csvFileData) => {
            const collegeHoldingRows = getRowsInCsvFileMatchingHrids(
              csvFileData,
              collegeHoldingHrids,
            );
            const universityHoldingRows = getRowsInCsvFileMatchingHrids(
              csvFileData,
              universityHoldingHrids,
            );

            collegeHoldingRows.forEach((collegeHoldingRow) => {
              cy.expect(
                collegeHoldingRow[
                  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS
                ],
              ).to.equal(updatedHoldingsCollegeElectronicAccessInFile);
            });
            universityHoldingRows.forEach((universityHoldingRow) => {
              cy.expect(
                universityHoldingRow[
                  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS
                ],
              ).to.equal(updatedHoldingsUniversityElectronicAccessInFile);
            });
          });

          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(4);

          holdingHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
              updatedHoldingsElectronicAccess,
            );
          });

          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

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
              ).to.equal(updatedHoldingsCollegeElectronicAccessInFile);
            });
            universityHoldingRows.forEach((universityRow) => {
              cy.expect(
                universityRow[BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS],
              ).to.equal(updatedHoldingsUniversityElectronicAccessInFile);
            });
          });

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

          collegeHoldingHrids.forEach((collegeHoldingHrid) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.searchHoldingsByHRID(collegeHoldingHrid);
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.waitLoading();

            HoldingsRecordView.checkElectronicAccess('-', '-');
            HoldingsRecordView.checkElectronicAccess('-', '-', '-', '-', 1);
          });

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);

          universityHoldingHrids.forEach((universityHoldingHrid) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.searchHoldingsByHRID(universityHoldingHrid);
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.waitLoading();

            HoldingsRecordView.checkElectronicAccess('-', '-');
          });
        },
      );
    });
  });
});
