import {
  Button,
  TextField,
  Pane,
  Link,
  including,
  KeyValue
} from '../../../../../interactors';

const oclcWorldcatPane = Pane('✓ OCLC WorldCat');

export default {
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
        name: 'OCLC WorldCat',
        url: 'zcat.oclc.org/OLUCWorldCat',
        externalIdQueryMap: '@attr 1=1211 $identifier',
        internalIdEmbedPath: '999ff$i',
        createJobProfileId: 'd0ebb7b0-2f0f-11eb-adc1-0242ac120002',
        updateJobProfileId: '91f9b8d6-d80e-4727-9783-73fb53e3c786',
        targetOptions: { charset: 'utf-8' },
        externalIdentifierType: '439bfbae-75bc-4f74-9fc7-b2a2d47ce3ef',
        enabled: true,
        authentication: value
      },
      isDefaultSearchParamsRequired: false,
    });
  },

  openOclcWorldCat:() => {
    cy.do(Pane('Z39.50 target profiles')
      .find(Link({ href: including('/settings/inventory/targetProfiles/f26df83c-aa25-40b6-876e-96852c3d4fd4') }))
      .click());
  },

  editOclcWorldCat:(auth) => {
    cy.do(oclcWorldcatPane.find(Button('Edit')).click());
    cy.do(TextField({ name:'authentication' }).fillIn(auth));
    cy.do(Pane('OCLC WorldCat').find(Button('Save & close')).click());
  },

  checkIsOclcWorldCatIsChanged:(auth) => cy.expect(oclcWorldcatPane.find(KeyValue({ value: auth })))
};
