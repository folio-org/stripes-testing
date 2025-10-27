import Permissions from '../../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../../support/dictionary/affiliations';
import Users from '../../../../../../support/fragments/users/users';
import TopMenu from '../../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../../../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../../support/constants';
import QuickMarcEditor from '../../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../../support/fragments/marcAuthority/marcAuthorities';
import InventorySearchAndFilter from '../../../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../../../../support/fragments/inventory/search/browseContributors';
import BrowseSubjects from '../../../../../../support/fragments/inventory/search/browseSubjects';
import MarcAuthorityBrowse from '../../../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthoritiesSearch from '../../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import HoldingsRecordEdit from '../../../../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../../../../support/fragments/inventory/holdingsRecordView';
import InventoryViewSource from '../../../../../../support/fragments/inventory/inventoryViewSource';
import Location from '../../../../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../../../../support/fragments/settings/tenant/servicePoints/servicePoints';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          instanceValueToUpdate:
            '$aC410819 Murder in Mérida, 1792 : (Updated)$bviolence, factions, and the law /$cMark W. Lentz.',
          updatedInstanceTitle:
            'C410819 Murder in Mérida, 1792 : (Updated) violence, factions, and the law / Mark W. Lentz.',
          authoritySearchOption: 'Keyword',
          browseSearchOption: 'Personal name',
          searchValue: 'Lentz, Mark.,',
          selectedFilterValue: 'personalNameTitle',
          toggle: 'Browse',
          contributor: 'Contributor',
          linkAuthorityIcon: 'Linked to MARC authority',
        };

        const linkingTagAndValues = {
          authorityHeading: 'Lentz C410819',
          rowIndex: 16,
          tag: '100',
          secondBox: '1',
          thirdBox: '\\',
          content: '$a Lentz C410819',
          eSubfield: '$e author.',
          zeroSubfield: '$0 http://id.loc.gov/authorities/names/n2011410819',
          seventhBox: '',
        };

        const users = {};

        const marcFiles = [
          {
            marc: 'marcBibFileForC410819.mrc',
            fileNameImported: `testMarcFileC410819.${getRandomPostfix()}.mrc`,
            propertyName: 'instance',
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          },
          {
            marc: 'marcAuthFileForC410819.mrc',
            fileNameImported: `testMarcFileC410819.${getRandomPostfix()}.mrc`,
            propertyName: 'authority',
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          },
        ];

        const createdRecordIDs = [];
        const location = {};

        before('Create users, data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C410819');
          InventoryInstances.deleteInstanceByTitleViaApi('C410819');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ])
            .then((userProperties) => {
              users.userProperties = userProperties;
              MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(
                linkingTagAndValues.authorityHeading,
              );
            })
            .then(() => {
              cy.assignAffiliationToUser(Affiliations.University, users.userProperties.userId);
              cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
              cy.setTenant(Affiliations.College);
              ServicePoints.getViaApi().then((servicePoint) => {
                Location.createViaApi(Location.getDefaultLocation(servicePoint[0].id)).then(
                  (res) => {
                    Object.assign(location, res);
                  },
                );
              });
              cy.assignPermissionsToExistingUser(users.userProperties.userId, [
                Permissions.inventoryAll.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
                Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
              ]);
            })
            .then(() => {
              cy.setTenant(Affiliations.University);
              cy.assignPermissionsToExistingUser(users.userProperties.userId, [
                Permissions.inventoryAll.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              ]);
            })
            .then(() => {
              cy.resetTenant();
              cy.getAdminToken().then(() => {
                marcFiles.forEach((marcFile) => {
                  DataImport.uploadFileViaApi(
                    marcFile.marc,
                    marcFile.fileNameImported,
                    marcFile.jobProfileToRun,
                  ).then((response) => {
                    response.forEach((record) => {
                      createdRecordIDs.push(record[marcFile.propertyName].id);
                    });
                  });
                });
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.loginAsAdmin({
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              InventoryInstances.waitContentLoading();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              InventoryInstances.searchByTitle(createdRecordIDs[0]);
              InventoryInstances.selectInstance();
              InventoryInstance.pressAddHoldingsButton();
              HoldingsRecordEdit.changePermanentLocation(location.name);
              HoldingsRecordEdit.saveAndClose();
              InventoryInstance.openHoldingView();
              HoldingsRecordView.getHoldingsIDInDetailView().then((holdingsID) => {
                createdRecordIDs.push(holdingsID);
              });

              cy.resetTenant();
              cy.login(users.userProperties.username, users.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              InventoryInstances.waitContentLoading();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            });
        });

        after('Delete users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          cy.deleteHoldingRecordViaApi(createdRecordIDs[2]);
          Location.deleteInstitutionCampusLibraryLocationViaApi(
            location.institutionId,
            location.campusId,
            location.libraryId,
            location.id,
          );
          cy.resetTenant();
          Users.deleteViaApi(users.userProperties.userId);
          InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
          MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
        });

        it(
          'C410819 Link Shared MARC bib (shadow MARC Instance) with Shared MARC authority from Member tenant (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C410819'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.checkExpectedMARCSource();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.updateExistingField('245', testData.instanceValueToUpdate);
            QuickMarcEditor.clickLinkIconInTagField(linkingTagAndValues.rowIndex);
            MarcAuthorityBrowse.checkSearchOptions();
            MarcAuthoritiesSearch.verifyFiltersState(
              testData.selectedFilterValue,
              testData.searchValue,
              testData.toggle,
            );
            MarcAuthorities.searchByParameter(
              testData.browseSearchOption,
              linkingTagAndValues.authorityHeading,
            );
            MarcAuthorities.selectTitle(`Shared\n${linkingTagAndValues.authorityHeading}`);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              linkingTagAndValues.tag,
              linkingTagAndValues.rowIndex,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              linkingTagAndValues.rowIndex,
              linkingTagAndValues.tag,
              linkingTagAndValues.secondBox,
              linkingTagAndValues.thirdBox,
              linkingTagAndValues.content,
              linkingTagAndValues.eSubfield,
              linkingTagAndValues.zeroSubfield,
              linkingTagAndValues.seventhBox,
            );

            QuickMarcEditor.deleteFieldByTagAndCheck('010');
            QuickMarcEditor.saveAndCloseAfterFieldDelete();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.checkPresentedText(testData.updatedInstanceTitle);
            InventoryInstance.verifyRecordAndMarcAuthIcon(
              testData.contributor,
              `${testData.linkAuthorityIcon}\n${linkingTagAndValues.authorityHeading}`,
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            cy.visit(TopMenu.marcAuthorities);
            MarcAuthorities.searchBy(
              testData.authoritySearchOption,
              linkingTagAndValues.authorityHeading,
            );
            MarcAuthorities.selectTitle(`Shared\n${linkingTagAndValues.authorityHeading}`);
            MarcAuthorities.checkRecordDetailPageMarkedValue(linkingTagAndValues.authorityHeading);
            MarcAuthorities.closeMarcViewPane();
            MarcAuthorities.verifyNumberOfTitles(5, '1');
            MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
            InventoryInstance.verifyInstanceTitle(testData.updatedInstanceTitle);
            InventoryInstance.checkExpectedMARCSource();
            InventoryInstance.viewSource();
            InventoryViewSource.contains(
              `${testData.linkAuthorityIcon}\n\t${linkingTagAndValues.tag}\t1  \t$a Lentz C410819 $e author. $0 http://id.loc.gov/authorities/names/n2011410819 $9`,
            );
            InventoryViewSource.close();

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.verifyKeywordsAsDefault();
            BrowseContributors.select();
            cy.withinTenant(Affiliations.University, () => {
              BrowseContributors.waitForContributorToAppear(
                linkingTagAndValues.authorityHeading,
                true,
                true,
              );
            });

            BrowseContributors.browse(linkingTagAndValues.authorityHeading);
            BrowseSubjects.checkRowWithValueAndAuthorityIconExists(
              linkingTagAndValues.authorityHeading,
            );
            BrowseSubjects.selectInstanceWithAuthorityIcon(linkingTagAndValues.authorityHeading);
            InventoryInstance.verifyInstanceTitle(testData.updatedInstanceTitle);
            InventoryInstance.checkExpectedMARCSource();
            InventoryInstance.verifyRecordAndMarcAuthIcon(
              testData.contributor,
              `${testData.linkAuthorityIcon}\n${linkingTagAndValues.authorityHeading}`,
            );
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
          },
        );
      });
    });
  });
});
