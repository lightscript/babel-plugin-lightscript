otherCondition() -> true

ThingsList1({ things, selectedId }) =>
  <ul>
    {[for const thing of things:
        if thing.id == selectedId and otherCondition():
          <SpecialThing thing={thing} />
        else:
          <Thing thing={thing} />
    ]}
  </ul>

ThingsList2({ things, selectedId }) =>
  <ul>
    {things.map(thing ->
      if thing.id == selectedId and otherCondition():
        <SpecialThing thing={thing} />
      else:
        <Thing thing={thing} />
    )}
  </ul>


ThingsList3({ things, selectedId }) =>
  <ul>
    {[
      for elem thing in things {
        if thing.id == selectedId and otherCondition() {
          <SpecialThing thing={thing} />
        } else {
          <Thing thing={thing} />
        }
      }
    ]}
  </ul>
