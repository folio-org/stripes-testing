import InventoryInstance from './inventoryInstance';
import QuickMarcEditor from '../quickMarcEditor';

export default {
  addMarcHoldingRecord:() => {
    InventoryInstance.goToMarcHoldingRecordAdding();
    QuickMarcEditor.waitLoading();
    QuickMarcEditor.updateExistingField('852', QuickMarcEditor.getExistingLocation());
    QuickMarcEditor.pressSaveAndClose();
  },
};
