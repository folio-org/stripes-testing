import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TargetProfileView from '../../../support/fragments/settings/inventory/integrations/targetProfileView';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';


import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';

import InventoryModals from '../../../support/fragments/inventory/inventoryModals';

import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';

import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import Users from '../../../support/fragments/users/users';


describe('ui-inventory', () => {
  let user;
  let instanceHRID;
  const fileName = `C375146autotestFile.${getRandomPostfix()}.mrc`;
  const targetProfile = {
    name: 'OCLC WorldCat',
    url: 'zcat.oclc.org/OLUCWorldCat',
    authentification: '100473910/PAOLF',
    externalId: '@attr 1=1211 $identifier',
    internalId: '999ff$i'
  };

  before('login', () => {
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    cy.getAdminToken()
      .then(() => {
        DataImport.uploadFileViaApi('oneMarcBib.mrc', fileName);
        JobProfiles.waitFileIsImported(fileName);
        Logs.openFileDetails(fileName);
        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then(initialInstanceHrId => {
          instanceHRID = initialInstanceHrId;
        });
        Z3950TargetProfiles.changeOclcWorldCatValueViaApi('100473910/PAOLF');
        cy.visit(SettingsMenu.targetProfilesPath);
        Z3950TargetProfiles.openTargetProfile();
        TargetProfileView.verifyTargetProfileForm(
          targetProfile.name,
          targetProfile.url,
          targetProfile.authentification,
          targetProfile.externalId,
          targetProfile.internalId
        );
      });

    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.uiInventorySingleRecordImport.gui,
      permissions.settingsDataImportEnabled.gui
    ])
      .then(userProperties => {
        user = userProperties;

        cy.login(user.username, user.password,
          { path: TopMenu.inventoryPath, waiter: InventoryInstances.waitContentLoading });
      });
  });

  it('C375146 Verify the modal window for ISRI In inventory instance details menu for single target profile (update) (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      InventorySearchAndFilter.searchInstanceByHRID(instanceHRID);
      InventoryInstance.startOverlaySourceBibRecord();

    });
});
