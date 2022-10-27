// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, {useState, useEffect, useContext, useMemo} from 'react';
import {View, Platform, ViewStyle, TextStyle, PermissionsAndroid} from 'react-native';
import Settings from './Settings';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';
import {
  NavigationParams,
  Pages,
  NavigationPages,
  Literal,
  // ChartType,
} from 'types';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {
  LogsProvider,
  StorageProvider,
  IoTCProvider,
  ThemeProvider,
  StorageContext,
} from 'contexts';
import LogoLight from './assets/IoT-Plug-And-Play_Dark.svg';
import LogoDark from './assets/IoT-Plug-And-Play_Light.svg';
import {Icon} from '@rneui/themed';
import {createStackNavigator} from '@react-navigation/stack';
import {Text} from './components/typography';
import {Welcome} from './Welcome';
import Home from './Home';
import {
  useConnectIoTCentralClient,
  useDeliveryInterval,
  useSimulation,
  useTheme,
  useThemeMode,
} from 'hooks';
import {Registration} from './Registration';
import {Loader} from './components/loader';
import Chart from 'Chart';
import Strings from 'strings';
import {Option} from 'components/options';
import Options from 'components/options';
import { BleManager, State } from 'react-native-ble-plx';
import {Buffer} from 'buffer';

const Stack = createStackNavigator<NavigationPages>();

export default function App() {
  const [initialized, setInitialized] = useState(false);
  const bleManager = React.useRef<BleManager>();

  React.useEffect(() => {
    (async function() {
      if (Platform.OS === 'android') {
        console.log('REQUESTING PERMS');
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Bluetooth Permission',
            message: `Application would like to use bluetooth and location permissions`,
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          throw new Error("Permission rejected");
        }
      }
  
      if (!bleManager.current) {
        bleManager.current = new BleManager();
      }
  
      const sub = bleManager.current.onStateChange(s => {
        if (s === State.PoweredOn) {
          sub.remove();
          console.log('connecting to device');

          bleManager.current?.startDeviceScan(null, {scanMode: 2}, (e, device) => {
            if (device?.name?.startsWith('Govee') && device.manufacturerData) {
              // console.log('manufacturer data: ', device.manufacturerData);
              const buf = Buffer.from(device.manufacturerData, 'base64');
              if (buf.toString('ascii').includes('INTELLI_ROCKS')) {
                return;
              }

              // 88 ec 00 14 09 3b 0e 64 02
              // 0  1  2 [3  4] [5  6] [7]  8
              //          ^      ^      ^
              //          temp   hum    batt

              const temp = buf.readInt16LE(3) / 100;
              const humidity = buf.readInt16LE(5) / 100;
              const battery = buf.readUint8(7);
              console.log(device.manufacturerData)
              console.log({temp, humidity, battery});
            }
          });

          // bleManager.current?.connectToDevice('A4:C1:38:CE:EE:BF', {})
          // // bleManager.current?.connectToDevice('A0:38:F8:A7:28:D2')
          //   .then(device => {
          //     console.log('discovering')
          //     return device.discoverAllServicesAndCharacteristics();
          //   })
          //   .then(device => {
          //     console.log('reading services')
          //     return device.services();
          //   })
          //   .then(services => {
          //       console.log('mapping chars')
          //       return Promise.all(services.map(s => s.characteristics()));
          //   })
          //   .then(chars => {
          //     console.log('reading chars')
          //     // chars.flat().forEach(c => {
          //     //   console.log(JSON.stringify({...c, '_manager': undefined}, null, 4))
          //     // })
          //     return Promise.all(
          //       chars
          //         .flat()
          //         // .forEach(c => {
          //         //   if (c.isReadable && c.isNotifiable) {
          //         //     console.log('Monitoring char', c.uuid)
          //         //     c.monitor((e, char) => {
          //         //       console.log('Notified by char', c.uuid)
          //         //       if (e) {
          //         //         console.error(e);
          //         //       }
  
          //         //       if (char?.value) {
          //         //         console.log('Char', char.uuid, char.value);
          //         //       }
          //         //     })
          //         //   }
          //         // })
          //         .filter(char => char.isReadable)
          //         .map(char => char.read())
          //     );
          //   })
          //   .then(chars => {
          //     console.log('reading values')
          //     chars.forEach(c => {
          //         if (c.value) {
          //           // const val = Buffer.from(c.value, 'base64');
          //           // const num = new DataView(val.buffer).getInt16(0)
                    
          //           console.log('Value of characteristic:', c.uuid, c.value, JSON.stringify({...c, '_manager': undefined}, null, 4))
          //         }
          //     });
          //   })
          //   .catch(console.error)
        }
        console.log('BLUETOOTH STATE:', s);
      }, true);
    })();
  }, []);

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <IoTCProvider>
          <StorageProvider>
            <LogsProvider>
              {initialized ? (
                <Navigation />
              ) : (
                <Welcome
                  title={Strings.Title}
                  setInitialized={setInitialized}
                />
              )}
            </LogsProvider>
          </StorageProvider>
        </IoTCProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

const Navigation = React.memo(() => {
  const {mode, type: themeType, setThemeMode} = useThemeMode();
  const {credentials, initialized} = useContext(StorageContext);
  const [deliveryInterval, setDeliveryInterval] = useDeliveryInterval();
  const [connect, cancel, , {client, loading}] = useConnectIoTCentralClient();
  const [simulated] = useSimulation();

  useEffect(() => {
    if (credentials && initialized && !client) {
      connect(credentials, {restore: true});
    }
  }, [connect, client, credentials, initialized]);

  return (
    <NavigationContainer theme={mode === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack.Navigator
        initialRouteName={simulated ? Pages.ROOT : Pages.REGISTRATION}
        screenOptions={({navigation, route}) => {
          const defaultOptions = {
            gestureEnabled: false,
            headerBackTitleVisible: false,
          };
          if (
            route.name === Pages.ROOT ||
            (route.name === Pages.REGISTRATION && !route.params?.previousScreen)
          ) {
            return {
              ...defaultOptions,
              headerTitle: () => null,
              headerLeft: () => <Logo />,
              headerRight: () => <Profile navigate={navigation.navigate} />,
            };
          }
          return defaultOptions;
        }}>
        {/* @ts-ignore */}
        <Stack.Screen name={Pages.ROOT} component={Home} />
        <Stack.Screen name={Pages.REGISTRATION} component={Registration} />
        <Stack.Screen
          name={Pages.INSIGHT}
          component={Chart}
          options={({route}) => {
            let data = {};
            if (route.params) {
              const params = route.params as NavigationParams;
              if (params.title) {
                data = {...data, headerTitle: params.title};
              }
              if (params.backTitle) {
                data = {...data, headerBackTitle: params.backTitle};
              }
            }
            return data;
          }}
        />
        <Stack.Screen name={Pages.SETTINGS} component={Settings} />
        <Stack.Screen
          name={Pages.THEME}
          options={() => ({
            stackAnimation: 'flip',
            headerTitle: Platform.select({
              ios: undefined,
              android: Pages.THEME,
            }),
          })}>
          {() => (
            <Options
              items={[
                {
                  id: 'DEVICE',
                  name: Strings.Settings.Theme.Device.Name,
                  details: Strings.Settings.Theme.Device.Detail,
                },
                {
                  id: 'DARK',
                  name: Strings.Settings.Theme.Dark.Name,
                  details: Strings.Settings.Theme.Dark.Detail,
                },
                {
                  id: 'LIGHT',
                  name: Strings.Settings.Theme.Light.Name,
                  details: Strings.Settings.Theme.Light.Detail,
                },
              ]}
              defaultId={themeType}
              onChange={(item: Option) => {
                setThemeMode(item.id);
              }}
            />
          )}
        </Stack.Screen>
        <Stack.Screen
          name={Pages.INTERVAL}
          options={() => ({
            stackAnimation: 'flip',
            headerTitle: Platform.select({
              ios: undefined,
              android: Pages.INTERVAL,
            }),
          })}>
          {() => (
            <Options
              items={[
                {
                  id: '2',
                  name: Strings.Settings.DeliveryInterval[2],
                },
                {
                  id: '5',
                  name: Strings.Settings.DeliveryInterval[5],
                },
                {
                  id: '10',
                  name: Strings.Settings.DeliveryInterval[10],
                },
                {
                  id: '30',
                  name: Strings.Settings.DeliveryInterval[30],
                },
                {
                  id: '45',
                  name: Strings.Settings.DeliveryInterval[45],
                },
              ]}
              defaultId={`${deliveryInterval}`}
              onChange={async (item: Option) => {
                await setDeliveryInterval(+item.id);
              }}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
      <Loader
        visible={loading}
        modal={true}
        message={Strings.Registration.Connection.Loading}
        buttons={[
          {
            text: Strings.Registration.Connection.Cancel,
            onPress: cancel,
          },
        ]}
      />
    </NavigationContainer>
  );
});

const Logo = React.memo(() => {
  const {colors, dark} = useTheme();
  const textStyle = useMemo<ViewStyle | TextStyle>(
    () => ({
      ...styles.logoText,
      color: colors.text,
    }),
    [colors.text],
  );

  return (
    <View style={styles.logoContainer}>
      {dark ? (
        <LogoDark width={30} fill={colors.primary} />
      ) : (
        <LogoLight width={30} fill={colors.primary} />
      )}
      <Text style={textStyle}>{Strings.Title}</Text>
    </View>
  );
});

const Profile = React.memo((props: {navigate: any}) => {
  const {colors} = useTheme();
  return (
    <View style={styles.marginHorizontal10}>
      <Icon
        style={styles.marginEnd20}
        name={
          Platform.select({
            ios: 'settings-outline',
            android: 'settings',
          }) as string
        }
        type={Platform.select({ios: 'ionicon', android: 'material'})}
        color={colors.text}
        onPress={() => {
          props.navigate(Pages.SETTINGS);
        }}
      />
    </View>
  );
});

const styles: Literal<ViewStyle | TextStyle> = {
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: 10,
  },
  logoText: {
    marginStart: 10,
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.1,
  },
  marginHorizontal10: {
    marginHorizontal: 10,
  },
  marginEnd20: {
    marginEnd: 20,
  },
};
