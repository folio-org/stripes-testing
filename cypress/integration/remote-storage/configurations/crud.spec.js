import { bigtestGlobals } from '@bigtest/globals';
import { Link } from '@bigtest/interactor';
import {
  Button,
  KeyValue,
  Layer,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  Pane,
  Select,
  TextField
} from '../../../../interactors';

bigtestGlobals.defaultInteractorTimeout = 10000;

describe('Configurations CRUD', () => {
  before(() => {
    cy.visit('/');

    cy.login('diku_admin', 'admin');

    // We rely here on Settings routing,
    // but navigate inside our own module-under-test using UI
    cy.visit('/settings/remote-storage');
    cy.do(Link('Configurations').click());
  });

  it('should provide happy path', function () {
    const NAME = 'CS1';
    const NAME_EDITED = 'CS2';
    const PROVIDER = 'Dematic EMS';
    const PROVIDER_CODE = 'DEMATIC_EMS';

    // Create
    cy.do(Button('+ New').click())
      .expect([
        Layer('Create configuration').exists(),
        TextField('Remote storage name\n*').is({ focused: true, value: '' }),
        Select('Provider name\n*').has({ value: '' }),
        Button('Cancel').exists(),
        Button('Save & close').exists(),
      ])

      .do([
        TextField('Remote storage name\n*').fillIn(NAME),
        Select('Provider name\n*').choose(PROVIDER),
        Button('Save & close').click(),
      ])
      .expect([
        Modal('Create configuration').exists(),
        Button('Cancel').exists(),
        Button('Save').exists(),
      ])

      .do(Button('Save').click())
      .expect([
        Modal('Create configuration').absent(),
        Layer('Create configuration').absent(),
        MultiColumnList('storages-list').exists(),
        MultiColumnListCell(NAME).exists(),
      ]);

    // Read
    cy.do(MultiColumnListCell(NAME).click())
      .expect([
        Pane(NAME).exists(),
        Button('Actions').exists(),
        KeyValue('Remote storage name').has({ value: NAME }),
        KeyValue('Provider name').has({ value: PROVIDER }),
      ]);

    // Update
    cy.do(Button('Actions').click())
      .expect(Button('Edit').exists())

      .do(Button('Edit').click())
      .expect([
        Layer(`Edit ${NAME}`).exists(),
        TextField('Remote storage name\n*').is({ focused: true, value: NAME }),
        Select('Provider name\n*').has({ value: PROVIDER_CODE }),
        Button('Cancel').exists(),
        Button('Save & close').exists(),
      ])

      .do([
        TextField('Remote storage name\n*').fillIn(NAME_EDITED),
        Button('Save & close').click(),
      ])
      .expect([
        Modal(`Edit ${NAME}`).exists(),
        Button('Cancel').exists(),
        Button('Save').exists(),
      ])

      .do(Button('Save').click())
      .expect([
        Modal(`Edit ${NAME}`).absent(),
        Layer(`Edit ${NAME}`).absent(),
        MultiColumnListCell(NAME).absent(),
        MultiColumnListCell(NAME_EDITED).exists(),
      ])

      .do(MultiColumnListCell(NAME_EDITED).click())
      .expect([
        Pane(NAME_EDITED).exists(),
        KeyValue('Remote storage name').has({ value: NAME_EDITED }),
      ]);

    // Update
    cy.do(Button('Actions').click())
      .expect(Button('Delete').exists())

      .do(Button('Delete').click())
      .expect([
        Modal(`Remove ${NAME_EDITED}`).exists(),
        Button('Cancel').exists(),
        Button('Delete').exists(),
      ])

      .do(Button('Delete').click())
      .expect([
        Modal(`Remove ${NAME_EDITED}`).absent(),
        MultiColumnListCell(NAME_EDITED).exists(),
      ]);
  });
});
