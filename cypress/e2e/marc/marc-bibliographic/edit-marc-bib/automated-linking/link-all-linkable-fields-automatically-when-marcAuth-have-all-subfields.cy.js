import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        const testData = {
          successCalout:
            'Field 100, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810, 811, and 830 has been linked to MARC authority record(s).',
        };

        const linkedTags = [
          [
            32,
            '100',
            '1',
            '\\',
            '$a C569607 Clovio, Giulio, $b best $c coin $d 1498-1578 $j joy $q query',
            '$e author.',
            '$0 http://id.loc.gov/authorities/names/n83073672569607',
            '',
          ],
          [
            33,
            '240',
            '\\',
            '\\',
            '$a pass (read only) $f pass (read only) $g pass (read only) $h pass (read only) $k pass (read only) $l epass (read only) $m pass (read only) $n pass (read only) $o pass (read only) $p pass (read only) $r pass (read only) $s pass (read only)',
            '',
            '$0 http://id.loc.gov/authorities/names/n80030866569607',
            '',
          ],
          [
            46,
            '600',
            '0',
            '0',
            '$a C569607 Black Panther $c (Fictitious character) $c second title $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision $b Numeration $d Dates associated with a name $g Miscellaneous information $j Attribution qualifier $q Fuller form of name $f Date of a work $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Wakanda Forever',
            '$i comics',
            '$0 http://id.loc.gov/authorities/names/n2016004082569607',
            '$4 .prt $2 test',
          ],
          [
            47,
            '610',
            '\\',
            '\\',
            '$a C569607 Radio Roma. $b Hrvatski program $c Location of meeting $d Date of meeting or treaty signing $g Miscellaneous information $f Date of a work $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section/meeting $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            '',
            '$0 4510955569607',
            '',
          ],
          [
            48,
            '611',
            '\\',
            '\\',
            '$a C569607 Roma Council $c Location of meeting $e Subordinate unit $q Name of meeting following jurisdiction name entry element $f Date of a work $h Medium $k Form subheading $l Language of a work $p Name of part/section of a work $s Version $t Title of a work $d Date of meeting or treaty signing $g Miscellaneous information $n Number of part/section/meeting $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            '',
            '$0 http://id.loc.gov/authorities/names/n79084170569607',
            '',
          ],
          [
            49,
            '630',
            '\\',
            '\\',
            '$a C569607 Marvel comics $d Date of treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            '',
            '$0 http://id.loc.gov/authorities/names/n80026955569607',
            '',
          ],
          [
            50,
            '650',
            '\\',
            '\\',
            '$a C569607 Speaking Oratory $b debating $g Miscellaneous information $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            '',
            '$0 http://id.loc.gov/authorities/subjects/sh85095298569607',
            '',
          ],
          [
            51,
            '651',
            '\\',
            '\\',
            '$a C569607 Clear Creek (Tex.) $g Place in Texas $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            '',
            '$0 http://id.loc.gov/authorities/names/n79041363569607',
            '',
          ],
          [
            52,
            '655',
            '\\',
            '\\',
            '$a C569607 Drama $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            '',
            '$0 http://id.loc.gov/authorities/genreForms/gf2014026297569607',
            '',
          ],
          [
            53,
            '700',
            '1',
            '\\',
            '$a C569607 Black Panther $b Numeration $c (Fictitious character) $c second title $d Dates associated with a name $j Attribution qualifier $q Fuller form of name $f Date of a work $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Wakanda Forever $g Miscellaneous information',
            '$e artist.',
            '$0 http://id.loc.gov/authorities/names/n2016004082569607',
            '',
          ],
          [
            54,
            '710',
            '1',
            '\\',
            '$a C569607 Radio Roma. $b Hrvatski program $c Location of meeting $f Date of a work $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work $d Date of meeting or treaty signing $g Miscellaneous information $n Number of part/section/meeting',
            '',
            '$0 4510955569607',
            '',
          ],
          [
            55,
            '711',
            '1',
            '\\',
            '$a C569607 Roma Council $c Location of meeting $e Subordinate unit $q Name of meeting following jurisdiction name entry element $f Date of a work $h Medium $k Form subheading $l Language of a work $p Name of part/section of a work $s Version $t Title of a work $d Date of meeting or treaty signing $g Miscellaneous information $n Number of part/section/meeting',
            '',
            '$0 http://id.loc.gov/authorities/names/n79084170569607',
            '',
          ],
          [
            56,
            '730',
            '1',
            '\\',
            '$a C569607 Marvel comics $d Date of treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work',
            '$e letterer.',
            '$0 http://id.loc.gov/authorities/names/n80026955569607',
            '',
          ],
          [
            57,
            '800',
            '1',
            '\\',
            '$a C569607 Black Panther $b Numeration $c (Fictitious character) $c second title $d Dates associated with a name $j Attribution qualifier $q Fuller form of name $f Date of a work $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Wakanda Forever $g Miscellaneous information',
            '',
            '$0 http://id.loc.gov/authorities/names/n2016004082569607',
            '',
          ],
          [
            58,
            '810',
            '1',
            '\\',
            '$a C569607 Radio Roma. $b Hrvatski program $c Location of meeting $f Date of a work $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work $d Date of meeting or treaty signing $g Miscellaneous information $n Number of part/section/meeting',
            '',
            '$0 4510955569607',
            '',
          ],
          [
            59,
            '811',
            '1',
            '\\',
            '$a C569607 Roma Council $c Location of meeting $e Subordinate unit $q Name of meeting following jurisdiction name entry element $f Date of a work $h Medium $k Form subheading $l Language of a work $p Name of part/section of a work $s Version $t Title of a work $d Date of meeting or treaty signing $g Miscellaneous information $n Number of part/section/meeting',
            '',
            '$0 http://id.loc.gov/authorities/names/n79084170569607',
            '',
          ],
          [
            60,
            '830',
            '1',
            '\\',
            '$a C569607 Marvel comics $d Date of treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work',
            '',
            '$0 http://id.loc.gov/authorities/names/n80026955569607',
            '',
          ],
        ];

        const marcFiles = [
          {
            marc: 'marcBibFileForC569607.mrc',
            fileName: `testMarcFileC569607.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC569607.mrc',
            fileName: `testMarcFileC569607.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            propertyName: 'authority',
          },
        ];

        let userData = {};
        const createdRecordIDs = [];

        before(() => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C569607*');

          cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
            testData.preconditionUserId = userProperties.userId;

            cy.getUserToken(userProperties.username, userProperties.password);
            marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  createdRecordIDs.push(record[marcFile.propertyName].id);
                });
              });
            });
          });

          cy.createTempUser([
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Deleting created users, Instances', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.preconditionUserId);
          Users.deleteViaApi(userData.userId);
          InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
          createdRecordIDs.forEach((id, index) => {
            if (index) {
              MarcAuthority.deleteViaAPI(id);
            }
          });
        });

        it(
          'C569607 Link all linkable fields automatically when MARC authority 1XXs have all subfields (spitfire)',
          { tags: ['criticalPath', 'spitfire', 'C569607'] },
          () => {
            InventoryInstances.waitContentLoading();
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(testData.successCalout);
            linkedTags.forEach((field) => {
              QuickMarcEditor.verifyTagFieldAfterLinking(...field);
            });
            QuickMarcEditor.clickSaveAndKeepEditingButton();
            cy.wait(2000);
            QuickMarcEditor.clickSaveAndKeepEditing();
            linkedTags.forEach((field) => {
              QuickMarcEditor.verifyTagFieldAfterLinking(...field);
            });
          },
        );
      });
    });
  });
});