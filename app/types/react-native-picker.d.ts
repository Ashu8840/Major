declare module "@react-native-picker/picker" {
  import * as React from "react";
  import { StyleProp, ViewStyle } from "react-native";

  export interface PickerProps {
    selectedValue?: any;
    onValueChange?: (itemValue: any, itemIndex: number) => void;
    style?: StyleProp<ViewStyle>;
    enabled?: boolean;
    mode?: "dialog" | "dropdown";
    children?: React.ReactNode;
  }

  export interface PickerItemProps {
    label: string;
    value: any;
    color?: string;
    enabled?: boolean;
    key?: string | number;
  }

  export class Picker extends React.Component<PickerProps> {
    static Item: React.ComponentType<PickerItemProps>;
  }
}
