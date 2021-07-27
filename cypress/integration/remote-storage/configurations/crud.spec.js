import { bigtestGlobals } from '@bigtest/globals';
import { Link } from '@bigtest/interactor';
import {
  Button,
  KeyValue,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  Pane,
  Select,
  TextField
} from '../../../../interactors';

bigtestGlobals.defaultInteractorTimeout = 10000;

describe('making CRUD', () => {
  before(() => {
    cy.visit('/');

    cy.login('diku_admin', 'admin');

    // We rely here on Settings routing,
    // but navigate inside our own module-under-test using UI
    cy.visit('/settings/remote-storage');
    cy.do(Link('Configurations').click());
  });

  it('should provide happy path', function () {
    const NAME = 'Test name 1';
    const NAME_EDITED = 'Test name 2 - edited';

    const PROVIDER = 'Dematic EMS';
    const PROVIDER_CODE = 'DEMATIC_EMS';

    // Create
    cy.do(Button('+ New').click())
      .expect([
        Pane('Create configuration').exists(),
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
        Modal('Create configuration').find(Button('Cancel')).exists(),
        Modal('Create configuration').find(Button('Save')).exists(),
      ])

      .do(Button('Save').click())
      .expect([
        Modal('Create configuration').absent(),
        Pane('Create configuration').absent(),
        MultiColumnList('storages-list').exists(),
        MultiColumnListCell(NAME).exists(),
      ]);

    // Read
    cy.do(MultiColumnListCell(NAME).click())
      .expect([
        Pane(NAME).exists(),
        Pane(NAME).find(Button('Actions')).exists(),
        KeyValue('Remote storage name').has({ value: NAME }),
        KeyValue('Provider name').has({ value: PROVIDER }),
      ]);

    // Update
    cy.do(Button('Actions').click())
      .expect(Button('Edit').exists())

      .do(Button('Edit').click())
      .expect([
        Pane(`Edit ${NAME}`).exists(),
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
        Modal(`Edit ${NAME}`).find(Button('Cancel')).exists(),
        Modal(`Edit ${NAME}`).find(Button('Save')).exists(),
      ])

      .do(Button('Save').click())
      .expect([
        Modal(`Edit ${NAME}`).absent(),
        Pane(`Edit ${NAME}`).absent(),
        MultiColumnListCell(NAME).absent(),
        MultiColumnListCell(NAME_EDITED).exists(),
      ])

      .do(MultiColumnListCell(NAME_EDITED).click())
      .expect([
        Pane(NAME_EDITED).exists(),
        Pane(NAME_EDITED).find(KeyValue('Remote storage name')).has({ value: NAME_EDITED }),
      ]);

    // Delete
    cy.do(Button('Actions').click())
      .expect(Button('Delete').exists())

      .do(Button('Delete').click())
      .expect([
        Modal(`Remove ${NAME_EDITED}`).exists(),
        Modal(`Remove ${NAME_EDITED}`).find(Button('Cancel')).exists(),
        Modal(`Remove ${NAME_EDITED}`).find(Button('Delete')).exists(),
      ])

      .do(Button('Delete').click())
      .expect([
        Modal(`Remove ${NAME_EDITED}`).absent(),
        MultiColumnListCell(NAME_EDITED).absent(),
      ]);
  });
});
