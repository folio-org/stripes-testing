import {
  DEFAULT_JOB_PROFILE_NAMES,
  REFERENCES_FILTER_CHECKBOXES,
} from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const testData = {
        headingTypes: ['Corporate Name', 'Conference Name'],
        tags: {
          tag711: '711',
        },
        instanceTitle:
          'Clarinet concerto no. 1, op. 73 [sound recording] / Weber. Andante, K. 315 / Stravinsky. Theme & variations / Rossini.',
        authTitles: ['Mostly Stravinsky Festival', 'Mostly Wagner Festival'],
        authRows: {
          wagnerAuth: {
            title: 'Mostly Wagner Festival',
            tag: '111',
          },
          wagnerRef: {
            title: 'Mostly Wagner Festival Orchestra',
            tag: '411',
          },
          wagnerAuthRef: {
            title: 'Mostly Wagner Music',
            tag: '500',
          },
        },
        instanceIDs: [],
        authorityIDs: [],
        authorizedColumnName: 'Authorized/Reference',
        marcFiles: [
          {
            marc: 'marcBib380433.mrc',
            fileName: `testMarcFileBibC380433.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numberOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthC380433.mrc',
            fileName: `testMarcFileAuthC380433.${randomFourDigitNumber()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numberOfRecords: 2,
            propertyName: 'authority',
          },
        ],
      };

      before('Creating user', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          InventoryInstances.getInstancesViaApi({
            limit: 100,
            query: `title="${testData.instanceTitle}"`,
          }).then((instances) => {
            if (instances) {
              instances.forEach(({ id }) => {
                InventoryInstance.deleteInstanceViaApi(id);
              });
            }
          });
          testData.authTitles.forEach((query) => {
            MarcAuthorities.getMarcAuthoritiesViaApi({
              limit: 100,
              query: `keyword="${query}" and (authRefType==("Authorized" or "Auth/Ref"))`,
            }).then((authorities) => {
              if (authorities) {
                authorities.forEach(({ id }) => {
                  MarcAuthority.deleteViaAPI(id);
                });
              }
            });
          });
          testData.marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                if (
                  marcFile.jobProfileToRun === DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS
                ) {
                  testData.instanceIDs.push(record[marcFile.propertyName].id);
                } else {
                  testData.authorityIDs.push(record[marcFile.propertyName].id);
                }
              });
            });
          });
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          InventoryInstances.searchByTitle(testData.instanceTitle);
          InventoryInstances.selectInstance();
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        testData.instanceIDs.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        testData.authorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
      });

      it(
        'C380433 Include/exclude Reference and Auth/Ref records in MARC authority plug-in results list while searching (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C380433'] },
        () => {
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon(testData.tags.tag711);
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
          MarcAuthorities.searchBy('Keyword', '*');

          MarcAuthoritiesSearch.selectExcludeReferencesFilter(
            REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM,
          );
          MarcAuthorities.verifyValueDoesntExistInColumn(
            testData.authorizedColumnName,
            'Reference',
          );

          MarcAuthoritiesSearch.selectExcludeReferencesFilter(
            REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO,
          );
          MarcAuthorities.verifyValueDoesntExistInColumn(
            testData.authorizedColumnName,
            'Reference',
          );
          MarcAuthorities.verifyValueDoesntExistInColumn(testData.authorizedColumnName, 'Auth/Ref');
          MarcAuthorities.verifyEveryRowContainsLinkButton();

          MarcAuthoritiesSearch.unselectExcludeReferencesFilter(
            REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM,
          );
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: testData.authorizedColumnName,
            expectedValues: ['Authorized', 'Reference'],
          });

          MarcAuthoritiesSearch.unselectExcludeReferencesFilter(
            REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO,
          );
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: testData.authorizedColumnName,
            expectedValues: ['Authorized', 'Reference', 'Auth/Ref'],
          });

          MarcAuthorities.searchBy('Keyword', 'Mostly Wagner');
          MarcAuthorities.selectItem(testData.authRows.wagnerAuth.title, false);
          MarcAuthorities.checkFieldAndContentExistence(
            testData.authRows.wagnerAuth.tag,
            testData.authRows.wagnerAuth.title,
          );
          MarcAuthorities.checkRecordDetailPageMarkedValue(testData.authRows.wagnerAuth.title);
          MarcAuthorities.verifyLinkButtonExistOnMarcViewPane();

          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          MarcAuthorities.selectItem(testData.authRows.wagnerRef.title, false);
          MarcAuthorities.checkFieldAndContentExistence(
            testData.authRows.wagnerRef.tag,
            testData.authRows.wagnerRef.title,
          );
          MarcAuthorities.checkRecordDetailPageMarkedValue(testData.authRows.wagnerRef.title);
          MarcAuthorities.verifyLinkButtonExistOnMarcViewPane();

          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          MarcAuthorities.selectItem(testData.authRows.wagnerAuthRef.title, false);
          MarcAuthorities.checkFieldAndContentExistence(
            testData.authRows.wagnerAuthRef.tag,
            testData.authRows.wagnerAuthRef.title,
          );
          MarcAuthorities.checkRecordDetailPageMarkedValue(testData.authRows.wagnerAuthRef.title);
          MarcAuthorities.verifyLinkButtonExistOnMarcViewPane(false);

          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
        },
      );
    });
  });
});
