import React, {useState} from 'react';
import {StyleProp, ViewStyle} from 'react-native';
import {
  Marker,
  // @ts-ignore
  Animated,
  PROVIDER_DEFAULT,
  AnimatedRegion,
} from 'react-native-maps';
import {GeoCoordinates} from '../types';

const Map = React.memo<{
  location: GeoCoordinates;
  style?: StyleProp<ViewStyle>;
}>(({location, style}) => {
  const [region, setRegion] = useState(
    new AnimatedRegion({
      latitude: location.lat,
      longitude: location.lon,
      latitudeDelta: location.latD ? location.latD : 0.0922,
      longitudeDelta: location.lonD ? location.lonD : 0.0421,
    }),
  );
  return (
    <Animated
      provider={PROVIDER_DEFAULT}
      style={style ? style : {width: '100%', height: '100%'}}
      scrollEnabled={true}
      zoomEnabled={true}
      rotateEnabled={true}
      region={region}
      onRegionChangeComplete={setRegion}>
      <Marker
        coordinate={{latitude: location.lat, longitude: location.lon}}
        title="Current location"
        description={`${location.lat
          .toString()
          .substring(0, 6)}... - ${location.lon.toString().substring(0, 6)}...`}
      />
    </Animated>
  );
});

export default Map;
