import {
  Button,
  TextField,
  Pane,
  Link,
  including,
  KeyValue,
  Selection,
  SelectionList,
  Select,
  MultiColumnListHeader,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  Callout
} from '../../../../../interactors';

const oclcWorldcatPane = Pane('✓ OCLC WorldCat');
const targetProfileName = Pane('Z39.50 target profiles');
const newPane = Pane('New');

const defaultCreateInstanceJobProfileName = 'Inventory Single Record - Default Create Instance (d0ebb7b0-2f0f-11eb-adc1-0242ac120002)';
const defaultUpdateInstanceJobProfileName = 'Inventory Single Record - Default Update Instance (91f9b8d6-d80e-4727-9783-73fb53e3c786)';
const linkTodefaultCreateInstanceJobProfile = '/settings/data-import/job-profiles/view/d0ebb7b0-2f0f-11eb-adc1-0242ac120002';
const linkTodefaultUpdateInstanceJobProfile = '/settings/data-import/job-profiles/view/91f9b8d6-d80e-4727-9783-73fb53e3c786';

function edit(profileName) {
  cy.do(Pane(profileName).find(Button('Edit')).click());
}
function save() {
  cy.do(Pane('OCLC WorldCat').find(Button('Save & close')).click());
}
function create() {
  cy.do(targetProfileName.find(Button('+ New')).click());
  cy.expect(newPane.exists());
}

function addJobProfileForCreate(profile = defaultCreateInstanceJobProfileName) {
  // wait until elements will be displayed on page
  cy.wait(1000);
  cy.do([
    Button('Add job profile for import/create').click(),
    Selection({ singleValue: 'Select job profile for import/create' }).open(),
    SelectionList().select(profile)
  ]);
}
function addJobProfileForUpdate(profile = defaultUpdateInstanceJobProfileName) {
  cy.do([
    Button('Add job profile for overlay/update').click(),
    Selection({ singleValue: 'Select job profile for overlay/update' }).open(),
    SelectionList().select(profile)
  ]);
}

function getMultiColumnListCellsValues() {
  const cells = [];
  return cy.get('[data-row-index="row-1"],[data-row-index="row-2"]').each($row => {
    // from each row, choose specific cell
    cy.get('[class*="mclCell-"]:nth-child(1)', { withinSubject: $row })
    // extract its text content
      .invoke('text')
      .then(cellValue => {
        cells.push(cellValue);
      });
  })
    .then(() => cells);
}

function validateStringsAscendingOrder(prev) {
  const itemsClone = [...prev];

  itemsClone.sort((a, b) => {
    // when sorting move falsy values to the end and localeCompare truthy values
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b);
  });

  expect(prev).to.deep.equal(itemsClone);
}

function validateJobProfilesSortingOrder() {
  getMultiColumnListCellsValues().then(cells => {
    validateStringsAscendingOrder(cells);
  });
}

export default {
  edit,
  save,
  create,
  addJobProfileForCreate,
  addJobProfileForUpdate,
  changeOclcWorldCatToDefaultViaApi:() => {
    cy.okapiRequest({
      method: 'PUT',
      path: 'copycat/profiles/f26df83c-aa25-40b6-876e-96852c3d4fd4',
      body: {
        name:'OCLC WorldCat',
        url:'zcat.oclc.org/OLUCWorldCat',
        externalIdQueryMap:'@attr 1=1211 $identifier',
        internalIdEmbedPath:'999ff$i',
        createJobProfileId:'d0ebb7b0-2f0f-11eb-adc1-0242ac120002',
        updateJobProfileId:'91f9b8d6-d80e-4727-9783-73fb53e3c786',
        targetOptions:{ charset:'utf-8' },
        externalIdentifierType:'439bfbae-75bc-4f74-9fc7-b2a2d47ce3ef',
        enabled:true
      },
      isDefaultSearchParamsRequired: false,
    });
  },

  changeOclcWorldCatValueViaApi: (value) => {
    cy.okapiRequest({
      method: 'PUT',
      path: 'copycat/profiles/f26df83c-aa25-40b6-876e-96852c3d4fd4',
      body: {
        name:'OCLC WorldCat',
        url:'zcat.oclc.org/OLUCWorldCat',
        externalIdQueryMap:'@attr 1=1211 $identifier',
        internalIdEmbedPath:'999ff$i',
        createJobProfileId:'d0ebb7b0-2f0f-11eb-adc1-0242ac120002',
        updateJobProfileId:'91f9b8d6-d80e-4727-9783-73fb53e3c786',
        allowedCreateJobProfileIds:['d0ebb7b0-2f0f-11eb-adc1-0242ac120002'],
        allowedUpdateJobProfileIds:['91f9b8d6-d80e-4727-9783-73fb53e3c786'],
        targetOptions:{ charset:'utf-8' },
        externalIdentifierType:'439bfbae-75bc-4f74-9fc7-b2a2d47ce3ef',
        enabled:true,
        authentication: value
      },
      isDefaultSearchParamsRequired: false,
    });
  },

  createNewZ3950TargetProfileViaApi:(name, createJobProfileIds, updateJobProfileIds) => {
    return cy.okapiRequest({
      method: 'POST',
      path: 'copycat/profiles',
      body: {
        name,
        url:'test.oclc.org',
        externalIdQueryMap:'@attr 1=1211 $identifier',
        internalIdEmbedPath:'999ff$i',
        createJobProfileId:'d0ebb7b0-2f0f-11eb-adc1-0242ac120002',
        updateJobProfileId:'91f9b8d6-d80e-4727-9783-73fb53e3c786',
        allowedCreateJobProfileIds:['d0ebb7b0-2f0f-11eb-adc1-0242ac120002', ...createJobProfileIds],
        allowedUpdateJobProfileIds:['91f9b8d6-d80e-4727-9783-73fb53e3c786', ...updateJobProfileIds],
        targetOptions:{ charset:'utf-8' },
        externalIdentifierType:'439bfbae-75bc-4f74-9fc7-b2a2d47ce3ef',
        enabled:true
      },
      isDefaultSearchParamsRequired: false,
    }).then(({ body }) => {
      return body.id;
    });
  },

  openTargetProfile:(id = 'f26df83c-aa25-40b6-876e-96852c3d4fd4') => {
    cy.do(targetProfileName
      .find(Link({ href: including(`/settings/inventory/targetProfiles/${id}`) }))
      .click());
  },

  editOclcWorldCat:(auth) => {
    edit();
    addJobProfileForCreate();
    addJobProfileForUpdate();
    cy.do([
      TextField({ name:'authentication' }).fillIn(auth),
      Select({ name:'externalIdentifierType' }).choose('OCLC')
    ]);
    save();
  },

  checkIsOclcWorldCatIsChanged:(auth) => cy.expect(oclcWorldcatPane.find(KeyValue({ value: auth }))),

  verifyTargetProfileFormOpened: () => {
    cy.expect(targetProfileName.exists());
  },

  verifyTargetProfileForm() {
    cy.expect([
      KeyValue('Name').exists(),
      KeyValue('URL').exists(),
      KeyValue('Authentication').exists(),
      KeyValue('External ID query map').exists(),
      KeyValue('Internal ID embed path').exists(),
      MultiColumnListHeader({ id:'create-job-profiles-list-column-id' }).exists(),
      MultiColumnListHeader({ id:'update-job-profiles-list-column-id' }).exists(),
      KeyValue('Target options').exists(),
      KeyValue('External identifier type').exists(),
      KeyValue('Enabled').exists()
    ]);
  },

  verifyCreateInstanceJobProfileList:(name) => {
    cy.expect(MultiColumnList({ ariaRowCount: 6 })
      .find(MultiColumnListRow({ indexRow: 'row-0' }))
      .find(MultiColumnListCell({ content: including('Inventory Single Record - Default Create Instance') }))
      .exists());
    validateJobProfilesSortingOrder();
    cy.expect([
      MultiColumnListHeader('Job profiles for import/create').exists(),
      MultiColumnListHeader('Default').exists()
    ]);
    // the job profile view is opened in a new tab but cypress can't work with tabs
    // check only the presence of a link for a job profile
    cy.expect(Pane(`✓ ${name}`)
      .find(Link({ href: including(linkTodefaultCreateInstanceJobProfile) }))
      .exists());
  },

  verifyUpdateInstanceJobProfileList:(name) => {
    cy.expect(MultiColumnList({ ariaRowCount: 5 })
      .find(MultiColumnListRow({ indexRow: 'row-0' }))
      .find(MultiColumnListCell({ content: including('Inventory Single Record - Default Update Instance') }))
      .exists());
    validateJobProfilesSortingOrder();
    cy.expect([
      MultiColumnListHeader('Job profiles for overlay/update').exists(),
      MultiColumnListHeader('Default').exists()
    ]);
    // the job profile view is opened in a new tab but cypress can't work with tabs
    // check only the presence of a link for a job profile
    cy.expect(Pane(`✓ ${name}`)
      .find(Link({ href: including(linkTodefaultUpdateInstanceJobProfile) }))
      .exists());
  },

  verifyTargetProfileIsCreated:(name, message) => {
    cy.expect([
      newPane.absent(),
      Pane(`✕ ${name}`).exists()
    ]);
    // cy.expect(Callout({ textContent: 'The Z39.50 target profile was successfully created.'}).exists());
  },

  verifyTargetProfileIsUpdated:(name, newName, message) => {
    cy.expect([
      Pane(name).absent(),
      Pane(`✕ ${newName}`).exists()
    ]);
    // cy.expect(Callout({ textContent: 'The Z39.50 target profile was successfully updated.' }).exists());
  },

  getTargetProfileIdViaApi:(searchParams) => {
    return cy
      .okapiRequest({
        path: 'copycat/profiles',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(response => {
        return response.body.profiles[0].id;
      });
  }
};
