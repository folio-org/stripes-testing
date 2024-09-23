import {
  DEFAULT_JOB_PROFILE_NAMES,
  MARC_AUTHORITY_BROWSE_OPTIONS,
} from '../../../../support/constants';
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
    describe('plug-in MARC authority | Browse', () => {
      const browseValues = [
        {
          title: 'C442834Africa, East',
          numberOfRecords: 2,
          authRefType: 'Authorized',
        },
        {
          title: 'C442834British East Africa',
          numberOfRecords: 2,
          authRefType: 'Reference',
        },
      ];
      const marcFiles = [
        {
          marc: 'marcBibFileForC442834.mrc',
          fileName: `C442834testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
        {
          marc: 'marcFileForC442834.mrc',
          fileName: `C442834_testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          propertyName: 'authority',
        },
      ];
      const createdRecordsIDs = [];
      let userProperties;

      before('Creating user', () => {
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C442834*');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          userProperties = createdUserProperties;

          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdRecordsIDs.push(record[marcFile.propertyName].id);
              });
            });
          });

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          }).then(() => {
            InventoryInstances.searchByTitle(createdRecordsIDs[0]);
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon('700');
            MarcAuthorities.clickReset();
            MarcAuthorities.switchToBrowse();
            MarcAuthorities.selectSearchOptionInDropdown(
              MARC_AUTHORITY_BROWSE_OPTIONS.GEOGRAPHIC_NAME,
            );
          });
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userProperties.userId);
        if (createdRecordsIDs[0]) InventoryInstance.deleteInstanceViaApi(createdRecordsIDs[0]);
        createdRecordsIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id);
        });
      });

      it(
        'C442834 MARC Authority plug-in | Both MARC authority records with the same heading are returned as exact match via browse (spitfire)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          browseValues.forEach((browseValue) => {
            MarcAuthorities.searchBeats(browseValue.title);
            cy.wait(2000);
            MarcAuthorities.checkBrowseReturnsRecordsAsExactMatchInAuthorityModal(
              browseValue.title,
              browseValue.numberOfRecords,
              browseValue.authRefType,
            );
          });
        },
      );
    });
  });
});
