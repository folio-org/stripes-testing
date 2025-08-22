import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const testData = {
        searchOptionA: 'Name-title',
        searchOptionB: 'Personal name',
        typeOfHeadingA: 'Personal Name',
        typeOfHeadingB: 'Corporate Name',
        typeOfHeadingC: 'Conference Name',
        value: 'C380569 Twain, Mark, 1835-1910. Adventures of Huckleberry Finn',
        valurMarked: 'C380569 Twain, Mark,',
        type: 'Authorized',
      };

      const marcFileForC380569 = [
        {
          marc: 'oneMarcBib.mrc',
          fileName: `C380569 testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileC380569_1.mrc',
          fileName: `C380569 testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 1,
          propertyName: 'authority',
        },
        {
          marc: 'marcAuthFileC380569_2.mrc',
          fileName: `C380569 testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 1,
          propertyName: 'authority',
        },
        {
          marc: 'marcAuthFileC380569_3.mrc',
          fileName: `C380569 testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 1,
          propertyName: 'authority',
        },
      ];

      const createdAuthorityIDs = [];

      before('Creating user', () => {
        cy.getAdminToken();
        // make sure there are no duplicate authority records in the system
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380569*');

        cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
          testData.preconditionUserId = userProperties.userId;

          marcFileForC380569.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record[marcFile.propertyName].id);
              });
            });
          });
          InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        Users.deleteViaApi(testData.preconditionUserId);
        createdAuthorityIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id, true);
        });
      });

      it(
        'C380569 MARC Authority plug-in | Search using "Name-title" option (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C380569'] },
        () => {
          InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon('700');
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySearchOptions();
          MarcAuthorities.searchByParameter(testData.searchOptionA, '*');
          // wait for the results to be loaded.
          cy.wait(1000);
          MarcAuthorities.checkHeadingType(
            testData.type,
            testData.typeOfHeadingA,
            testData.typeOfHeadingB,
            testData.typeOfHeadingC,
          );
          MarcAuthorities.selectTitle(testData.value);
          MarcAuthorities.checkRecordDetailPageMarkedValue(testData.valurMarked);
          MarcAuthorities.searchBy(testData.searchOptionB, '*');
          MarcAuthorities.checkSingleHeadingType(testData.type, testData.typeOfHeadingA);
        },
      );
    });
  });
});
