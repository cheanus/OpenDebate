from neomodel import (
    StructuredNode,
    StringProperty,
    BooleanProperty,
    FloatProperty,
    RelationshipTo,
    RelationshipFrom,
    UniqueIdProperty,
    StructuredRel,
)


class Link(StructuredRel):
    uid = UniqueIdProperty()


class Opinion(StructuredNode):
    uid = StringProperty(index=True, required=True)
    content = StringProperty(required=True)
    host = StringProperty(required=True)
    logic_type = StringProperty(choices={"or": "or", "and": "and"}, required=True)
    node_type = StringProperty(
        choices={"solid": "solid", "empty": "empty"}, required=True
    )
    intermediate = BooleanProperty(default=False)
    positive_score = FloatProperty(min_value=0, max_value=1)  #type: ignore
    negative_score = FloatProperty(min_value=0, max_value=1)  #type: ignore
    son_positive_score = FloatProperty(min_value=0, max_value=1)  #type: ignore
    son_negative_score = FloatProperty(min_value=0, max_value=1)  #type: ignore

    supports = RelationshipTo("Opinion", "supports", model=Link)
    opposes = RelationshipTo("Opinion", "opposes", model=Link)
    supported_by = RelationshipFrom("Opinion", "supports", model=Link)
    opposed_by = RelationshipFrom("Opinion", "opposes", model=Link)
