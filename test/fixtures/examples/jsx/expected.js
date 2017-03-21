import React from "react";

function otherCondition() {
  return true;
}

const ThingsList1 = ({ things, selectedId }) => {
  return <ul>
    {(() => {
      const _arr = [];
      for (const thing of things) {
        if (thing.id === selectedId && otherCondition()) {
          _arr.push(<SpecialThing thing={thing} />);
        } else {
          _arr.push(<Thing thing={thing} />);
        }
      }return _arr;
    })()}
  </ul>;
};

const ThingsList2 = ({ things, selectedId }) => {
  return <ul>
    {things.map(function (thing) {
      if (thing.id === selectedId && otherCondition()) {
        return <SpecialThing thing={thing} />;
      } else {
        return <Thing thing={thing} />;
      }
    })}
  </ul>;
};

const ThingsList3 = ({ things, selectedId }) => {
  return <ul>
    {(() => {
      const _arr2 = [];

      for (const thing of things) {
        if (thing.id === selectedId && otherCondition()) {
          _arr2.push(<SpecialThing thing={thing} />);
        } else {
          _arr2.push(<Thing thing={thing} />);
        }
      }
      return _arr2;
    })()}
  </ul>;
};
