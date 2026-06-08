import Affiliations, { tenantNames } from '../../../../../../support/dictionary/affiliations';
import { Permissions } from '../../../../../../support/dictionary';
import ConsortiumManager from '../../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import InventoryInstance from '../../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../../support/fragments/topMenu';
import Users from '../../../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(7);
        const randomDigits = randomNDigitNumber(7);

        const testData = {
          instanceTitle: `AT_C770443_MarcBibInstance_${randomPostfix}`,
          naturalId600: `ATC770443600${randomLetters}${randomDigits}`,
          naturalId610: `ATC770443610${randomLetters}${randomDigits}`,
          naturalId611: `ATC770443611${randomLetters}${randomDigits}`,
          naturalId630: `ATC770443630${randomLetters}${randomDigits}`,
          naturalId650: `ATC770443650${randomLetters}${randomDigits}`,
          naturalId651: `ATC770443651${randomLetters}${randomDigits}`,
          naturalId655: `ATC770443655${randomLetters}${randomDigits}`,
          heading100: `AT_C770443_PersonalName_${randomPostfix}`,
          heading110: `AT_C770443_CorporateName_${randomPostfix}.`,
          heading111: `AT_C770443_MeetingName_${randomPostfix}`,
          heading130: `AT_C770443_UniformTitle_${randomPostfix}`,
          heading150: `AT_C770443_TopicalTerm_${randomPostfix}`,
          heading151: `AT_C770443_GeographicName_${randomPostfix}`,
          heading155: `AT_C770443_GenreForm_${randomPostfix}`,
          fields: {
            tag600: {
              tag: '600',
              rowIndex: 5,
              ind1: '0',
              ind2: '0',
            },
            tag610: {
              tag: '610',
              rowIndex: 6,
              ind1: '\\',
              ind2: '\\',
            },
            tag611: {
              tag: '611',
              rowIndex: 7,
              ind1: '\\',
              ind2: '\\',
            },
            tag630: {
              tag: '630',
              rowIndex: 8,
              ind1: '\\',
              ind2: '\\',
            },
            tag650: {
              tag: '650',
              rowIndex: 9,
              ind1: '\\',
              ind2: '\\',
            },
            tag651: {
              tag: '651',
              rowIndex: 10,
              ind1: '\\',
              ind2: '\\',
            },
            tag655: {
              tag: '655',
              rowIndex: 11,
              ind1: '\\',
              ind2: '\\',
            },
          },
        };

        // Expected values after linking (controlled content comes from authority headings)
        testData.fields.tag600.controlled = `$a ${testData.heading100} $b Numeration $c (Fictitious character) $d Dates associated with a name $c second title $f Date of a work $g Miscellaneous information $h Medium $j Attribution qualifier $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $q Fuller form of name $r Key for music $s Version $t Wakanda Forever $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision`;
        testData.fields.tag600.eSubfield = '$e Relator term';
        testData.fields.tag600.zeroSubfield = `$0 ${testData.naturalId600}`;
        testData.fields.tag600.seventhBox = '$4 .prt $2 test';

        testData.fields.tag610.controlled = `$a ${testData.heading110} $b Hrvatski program $c Location of meeting $d Date of meeting or treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section/meeting $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision`;
        testData.fields.tag610.eSubfield = '$e Relator term $u Affiliation';
        testData.fields.tag610.zeroSubfield = `$0 ${testData.naturalId610}`;
        testData.fields.tag610.seventhBox = '';

        testData.fields.tag611.controlled = `$a ${testData.heading111} $c Location of meeting $d Date of meeting or treaty signing $e Subordinate unit $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $n Number of part/section/meeting $p Name of part/section of a work $q Name of meeting following jurisdiction name entry element $s Version $t Title of a work`;
        testData.fields.tag611.eSubfield =
          '$b Subordinate unit $m Moo $o Opps $r right $u Date of meeting or treaty signing $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision';
        testData.fields.tag611.zeroSubfield = `$0 ${testData.naturalId611}`;
        testData.fields.tag611.seventhBox = '';

        testData.fields.tag630.controlled = `$a ${testData.heading130} $d Date of treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work`;
        testData.fields.tag630.eSubfield =
          '$e Term $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision';
        testData.fields.tag630.zeroSubfield = `$0 ${testData.naturalId630}`;
        testData.fields.tag630.seventhBox = '';

        testData.fields.tag650.controlled = `$a ${testData.heading150}`;
        testData.fields.tag650.eSubfield =
          '$b debating $c Location $d Date $e Term $g Miscellaneous information $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision';
        testData.fields.tag650.zeroSubfield = `$0 ${testData.naturalId650}`;
        testData.fields.tag650.seventhBox = '';

        testData.fields.tag651.controlled = `$a ${testData.heading151}`;
        testData.fields.tag651.eSubfield =
          '$e Term $g Place in Texas $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision';
        testData.fields.tag651.zeroSubfield = `$0 ${testData.naturalId651}`;
        testData.fields.tag651.seventhBox = '$4 Test';

        testData.fields.tag655.controlled = `$a ${testData.heading155} $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision`;
        testData.fields.tag655.eSubfield = '$b Bowl $c Chicken';
        testData.fields.tag655.zeroSubfield = `$0 ${testData.naturalId655}`;
        testData.fields.tag655.seventhBox = '$7 Luck';

        // Authority field definitions (heading fields matching source marcAuthFileC770443.mrc)
        const marcAuthority100Fields = [
          {
            tag: '100',
            content: `$a ${testData.heading100} $b Numeration $c (Fictitious character) $d Dates associated with a name $c second title $e Relator term $f Date of a work $g Miscellaneous information $h Medium $j Attribution qualifier $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $q Fuller form of name $r Key for music $s Version $t Wakanda Forever $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision`,
            indicators: ['1', '\\'],
          },
        ];

        const marcAuthority110Fields = [
          {
            tag: '110',
            content: `$a ${testData.heading110} $b Hrvatski program $c Location of meeting $d Date of meeting or treaty signing $e Relator term $e Term 2 $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section/meeting $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision`,
            indicators: ['2', '\\'],
          },
        ];

        const marcAuthority111Fields = [
          {
            tag: '111',
            content: `$a ${testData.heading111} $c Location of meeting $d Date of meeting or treaty signing $e Subordinate unit $f Date of a work $g Miscellaneous information $h Medium $j Relator term $k Form subheading $l Language of a work $n Number of part/section/meeting $p Name of part/section of a work $q Name of meeting following jurisdiction name entry element $s Version $t Title of a work $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision`,
            indicators: ['2', '\\'],
          },
        ];

        const marcAuthority130Fields = [
          {
            tag: '130',
            content: `$a ${testData.heading130} $d Date of treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision`,
            indicators: ['\\', '\\'],
          },
        ];

        const marcAuthority150Fields = [
          {
            tag: '150',
            content: `$a ${testData.heading150} $b debating $g Miscellaneous information $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision`,
            indicators: ['\\', '\\'],
          },
        ];

        const marcAuthority151Fields = [
          {
            tag: '151',
            content: `$a ${testData.heading151} $g Place in Texas $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision`,
            indicators: ['\\', '\\'],
          },
        ];

        const marcAuthority155Fields = [
          {
            tag: '155',
            content: `$a ${testData.heading155} $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision`,
            indicators: ['\\', '\\'],
          },
        ];

        // Bib fields (all subfields: controlled + non-controlled + $0 + special)
        const marcBibFields = [
          {
            tag: '008',
            content: QuickMarcEditor.valid008ValuesInstance,
          },
          {
            tag: '245',
            content: `$a ${testData.instanceTitle}`,
            indicators: ['1', '1'],
          },
          {
            tag: '600',
            content: `$a ${testData.heading100} $b Numeration $c (Fictitious character) $d Dates associated with a name $c second title $e Relator term $f Date of a work $g Miscellaneous information $h Medium $j Attribution qualifier $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $q Fuller form of name $r Key for music $s Version $t Wakanda Forever $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision $0 ${testData.naturalId600} $4 .prt $2 test`,
            indicators: ['0', '0'],
          },
          {
            tag: '610',
            content: `$a ${testData.heading110} $b Hrvatski program $c Location of meeting $d Date of meeting or treaty signing $e Relator term $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section/meeting $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work $u Affiliation $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision $0 ${testData.naturalId610}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: '611',
            content: `$a ${testData.heading111} $b Subordinate unit $c Location of meeting $d Date of meeting or treaty signing $e Subordinate unit $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Moo $n Number of part/section/meeting $o Opps $p Name of part/section of a work $q Name of meeting following jurisdiction name entry element $r right $s Version $t Title of a work $u Date of meeting or treaty signing $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision $0 ${testData.naturalId611}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: '630',
            content: `$a ${testData.heading130} $d Date of treaty signing $e Term $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision $0 ${testData.naturalId630}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: '650',
            content: `$a ${testData.heading150} $b debating $c Location $d Date $e Term $g Miscellaneous information $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision $0 ${testData.naturalId650}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: '651',
            content: `$a ${testData.heading151} $e Term $g Place in Texas $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision $0 ${testData.naturalId651} $4 Test`,
            indicators: ['\\', '\\'],
          },
          {
            tag: '655',
            content: `$a ${testData.heading155} $b Bowl $c Chicken $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision $0 ${testData.naturalId655} $7 Luck`,
            indicators: ['\\', '\\'],
          },
        ];

        // ruleId mapping: 8→600, 9→610, 10→611, 11→630, 12→650, 13→651, 14→655
        const authoritySubfieldsCentral = [
          {
            ruleId: '8',
            ruleSubfields: [
              'a',
              'b',
              'c',
              'd',
              'g',
              'j',
              'q',
              'f',
              'h',
              'k',
              'l',
              'm',
              'n',
              'o',
              'p',
              'r',
              's',
              't',
              'v',
              'x',
              'y',
              'z',
            ],
            autoLinkingEnabled: true,
          },
          {
            ruleId: '9',
            ruleSubfields: [
              'a',
              'b',
              'c',
              'd',
              'g',
              'f',
              'h',
              'k',
              'l',
              'm',
              'n',
              'o',
              'p',
              'r',
              's',
              't',
              'v',
              'x',
              'y',
              'z',
            ],
            autoLinkingEnabled: true,
          },
          {
            ruleId: '10',
            ruleSubfields: ['a', 'c', 'e', 'q', 'f', 'h', 'k', 'l', 'p', 's', 't', 'd', 'g', 'n'],
            autoLinkingEnabled: true,
          },
          {
            ruleId: '11',
            ruleSubfields: ['a', 'd', 'f', 'g', 'h', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't'],
            autoLinkingEnabled: true,
          },
          {
            ruleId: '12',
            ruleSubfields: ['a'],
            autoLinkingEnabled: true,
          },
          {
            ruleId: '13',
            ruleSubfields: ['a'],
            autoLinkingEnabled: true,
          },
          {
            ruleId: '14',
            ruleSubfields: ['a', 'v', 'x', 'y', 'z'],
            autoLinkingEnabled: true,
          },
        ];

        const authoritySubfieldsMember = [
          {
            ruleId: '8',
            ruleSubfields: [
              'a',
              'b',
              'c',
              'd',
              'g',
              'j',
              'q',
              'f',
              'h',
              'k',
              'l',
              'm',
              'n',
              'o',
              'p',
              'r',
              's',
              't',
            ],
            autoLinkingEnabled: true,
          },
          {
            ruleId: '9',
            ruleSubfields: [
              'a',
              'b',
              'c',
              'd',
              'g',
              'f',
              'h',
              'k',
              'l',
              'm',
              'n',
              'o',
              'p',
              'r',
              's',
              't',
            ],
            autoLinkingEnabled: true,
          },
          {
            ruleId: '10',
            ruleSubfields: [
              'a',
              'c',
              'e',
              'q',
              'f',
              'h',
              'k',
              'l',
              'p',
              's',
              't',
              'd',
              'g',
              'n',
              'v',
              'x',
              'y',
              'z',
            ],
            autoLinkingEnabled: true,
          },
          {
            ruleId: '11',
            ruleSubfields: ['a'],
            autoLinkingEnabled: true,
          },
          {
            ruleId: '12',
            ruleSubfields: ['a', 'b', 'g', 'v', 'x', 'y', 'z'],
            autoLinkingEnabled: true,
          },
          {
            ruleId: '13',
            ruleSubfields: ['a', 'g', 'v', 'x', 'y', 'z'],
            autoLinkingEnabled: true,
          },
          {
            ruleId: '14',
            ruleSubfields: ['a'],
            autoLinkingEnabled: true,
          },
        ];

        const createdRecordIDs = [];
        const users = {};

        before('Create user, set linking rules, create data via API', () => {
          cy.getAdminToken();

          // Cleanup any leftover data from previous runs
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C770443_');
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C770443_');

          // Set linking rules on Central
          authoritySubfieldsCentral.forEach(({ ruleId, ruleSubfields, autoLinkingEnabled }) => {
            QuickMarcEditor.setAuthoritySubfieldsViaApi(ruleId, ruleSubfields, autoLinkingEnabled);
          });

          // Set linking rules on Member (College)
          cy.setTenant(Affiliations.College);
          authoritySubfieldsMember.forEach(({ ruleId, ruleSubfields, autoLinkingEnabled }) => {
            QuickMarcEditor.setAuthoritySubfieldsViaApi(ruleId, ruleSubfields, autoLinkingEnabled);
          });
          cy.resetTenant();
          cy.getAdminToken();

          // Create shared authority records on Central
          MarcAuthorities.createMarcAuthorityViaAPI(
            testData.naturalId600,
            '',
            marcAuthority100Fields,
          ).then((authorityId) => {
            createdRecordIDs.push(authorityId);
          });

          MarcAuthorities.createMarcAuthorityViaAPI(
            testData.naturalId610,
            '',
            marcAuthority110Fields,
          ).then((authorityId) => {
            createdRecordIDs.push(authorityId);
          });

          MarcAuthorities.createMarcAuthorityViaAPI(
            testData.naturalId611,
            '',
            marcAuthority111Fields,
          ).then((authorityId) => {
            createdRecordIDs.push(authorityId);
          });

          MarcAuthorities.createMarcAuthorityViaAPI(
            testData.naturalId630,
            '',
            marcAuthority130Fields,
          ).then((authorityId) => {
            createdRecordIDs.push(authorityId);
          });

          MarcAuthorities.createMarcAuthorityViaAPI(
            testData.naturalId650,
            '',
            marcAuthority150Fields,
          ).then((authorityId) => {
            createdRecordIDs.push(authorityId);
          });

          MarcAuthorities.createMarcAuthorityViaAPI(
            testData.naturalId651,
            '',
            marcAuthority151Fields,
          ).then((authorityId) => {
            createdRecordIDs.push(authorityId);
          });

          MarcAuthorities.createMarcAuthorityViaAPI(
            testData.naturalId655,
            '',
            marcAuthority155Fields,
          ).then((authorityId) => {
            createdRecordIDs.push(authorityId);
          });

          // Create shared bib record on Central
          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
            (instanceId) => {
              createdRecordIDs.push(instanceId);
            },
          );

          // Create user and assign permissions
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ])
            .then((userProperties) => {
              users.userProperties = userProperties;
            })
            .then(() => {
              cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(users.userProperties.userId, [
                Permissions.inventoryAll.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
                Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
              ]);
            })
            .then(() => {
              cy.resetTenant();
              cy.login(users.userProperties.username, users.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              InventoryInstances.waitContentLoading();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            });
        });

        after('Delete user, data, restore linking rules', () => {
          cy.resetTenant();
          cy.getAdminToken();
          QuickMarcEditor.setAuthoritySubfieldsDefault();
          cy.setTenant(Affiliations.College);
          QuickMarcEditor.setAuthoritySubfieldsDefault();
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(users.userProperties.userId);
          InventoryInstance.deleteInstanceViaApi(createdRecordIDs[7]);
          createdRecordIDs.slice(0, 7).forEach((id) => {
            MarcAuthority.deleteViaAPI(id, true);
          });
        });

        it(
          'C770443 ECS | Auto-link 6XX "MARC Bib" fields using "Link headings" on Member tenant and verify fields after "Save & keep editing" (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C770443'] },
          () => {
            InventorySearchAndFilter.clearDefaultHeldbyFilter();
            InventoryInstances.searchByTitle(createdRecordIDs[7]);
            InventoryInstances.selectInstance();

            // Step 1: click Actions > Edit MARC bibliographic record
            InventoryInstance.editMarcBibliographicRecord();

            // Step 2: click "Link headings" – 600, 610, 611, 630, 650, 651, 655 are linked
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(
              'Field 600, 610, 611, 630, 650, 651, and 655 has been linked to MARC authority record(s).',
            );

            // Step 3: verify 600
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag600.rowIndex,
              testData.fields.tag600.tag,
              testData.fields.tag600.ind1,
              testData.fields.tag600.ind2,
              testData.fields.tag600.controlled,
              testData.fields.tag600.eSubfield,
              testData.fields.tag600.zeroSubfield,
              testData.fields.tag600.seventhBox,
            );

            // Step 4: verify 610
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag610.rowIndex,
              testData.fields.tag610.tag,
              testData.fields.tag610.ind1,
              testData.fields.tag610.ind2,
              testData.fields.tag610.controlled,
              testData.fields.tag610.eSubfield,
              testData.fields.tag610.zeroSubfield,
              testData.fields.tag610.seventhBox,
            );

            // Step 5: verify 611
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag611.rowIndex,
              testData.fields.tag611.tag,
              testData.fields.tag611.ind1,
              testData.fields.tag611.ind2,
              testData.fields.tag611.controlled,
              testData.fields.tag611.eSubfield,
              testData.fields.tag611.zeroSubfield,
              testData.fields.tag611.seventhBox,
            );

            // Step 6: verify 630
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag630.rowIndex,
              testData.fields.tag630.tag,
              testData.fields.tag630.ind1,
              testData.fields.tag630.ind2,
              testData.fields.tag630.controlled,
              testData.fields.tag630.eSubfield,
              testData.fields.tag630.zeroSubfield,
              testData.fields.tag630.seventhBox,
            );

            // Step 7: verify 650
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag650.rowIndex,
              testData.fields.tag650.tag,
              testData.fields.tag650.ind1,
              testData.fields.tag650.ind2,
              testData.fields.tag650.controlled,
              testData.fields.tag650.eSubfield,
              testData.fields.tag650.zeroSubfield,
              testData.fields.tag650.seventhBox,
            );

            // Step 8: verify 651
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag651.rowIndex,
              testData.fields.tag651.tag,
              testData.fields.tag651.ind1,
              testData.fields.tag651.ind2,
              testData.fields.tag651.controlled,
              testData.fields.tag651.eSubfield,
              testData.fields.tag651.zeroSubfield,
              testData.fields.tag651.seventhBox,
            );

            // Step 9: verify 655
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag655.rowIndex,
              testData.fields.tag655.tag,
              testData.fields.tag655.ind1,
              testData.fields.tag655.ind2,
              testData.fields.tag655.controlled,
              testData.fields.tag655.eSubfield,
              testData.fields.tag655.zeroSubfield,
              testData.fields.tag655.seventhBox,
            );

            // Step 10: click "Save & keep editing" – toast shown, pane stays open, fields remain linked
            QuickMarcEditor.clickSaveAndKeepEditing();
            QuickMarcEditor.checkAfterSaveAndKeepEditing();

            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag600.rowIndex,
              testData.fields.tag600.tag,
              testData.fields.tag600.ind1,
              testData.fields.tag600.ind2,
              testData.fields.tag600.controlled,
              testData.fields.tag600.eSubfield,
              testData.fields.tag600.zeroSubfield,
              testData.fields.tag600.seventhBox,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag610.rowIndex,
              testData.fields.tag610.tag,
              testData.fields.tag610.ind1,
              testData.fields.tag610.ind2,
              testData.fields.tag610.controlled,
              testData.fields.tag610.eSubfield,
              testData.fields.tag610.zeroSubfield,
              testData.fields.tag610.seventhBox,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag611.rowIndex,
              testData.fields.tag611.tag,
              testData.fields.tag611.ind1,
              testData.fields.tag611.ind2,
              testData.fields.tag611.controlled,
              testData.fields.tag611.eSubfield,
              testData.fields.tag611.zeroSubfield,
              testData.fields.tag611.seventhBox,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag630.rowIndex,
              testData.fields.tag630.tag,
              testData.fields.tag630.ind1,
              testData.fields.tag630.ind2,
              testData.fields.tag630.controlled,
              testData.fields.tag630.eSubfield,
              testData.fields.tag630.zeroSubfield,
              testData.fields.tag630.seventhBox,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag650.rowIndex,
              testData.fields.tag650.tag,
              testData.fields.tag650.ind1,
              testData.fields.tag650.ind2,
              testData.fields.tag650.controlled,
              testData.fields.tag650.eSubfield,
              testData.fields.tag650.zeroSubfield,
              testData.fields.tag650.seventhBox,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag651.rowIndex,
              testData.fields.tag651.tag,
              testData.fields.tag651.ind1,
              testData.fields.tag651.ind2,
              testData.fields.tag651.controlled,
              testData.fields.tag651.eSubfield,
              testData.fields.tag651.zeroSubfield,
              testData.fields.tag651.seventhBox,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag655.rowIndex,
              testData.fields.tag655.tag,
              testData.fields.tag655.ind1,
              testData.fields.tag655.ind2,
              testData.fields.tag655.controlled,
              testData.fields.tag655.eSubfield,
              testData.fields.tag655.zeroSubfield,
              testData.fields.tag655.seventhBox,
            );
          },
        );
      });
    });
  });
});
