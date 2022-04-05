import React from "react";
import {
  Card,
  CardContent,
  Typography,
  CardActionArea,
} from "@material-ui/core";
import { Cat } from "../Cat/Cat";
import { useHistory } from "react-router";
import { FetchedKitty } from "../../hooks/useFetchKitty";
import { GenChip } from "../Chips/GenChip";
import { useDrag, useDrop } from "react-dnd";
import { ItemTypes } from "../KittyGrid/KittyGrid";
import { primaryColor } from "../../theme/theme";
import { OfferChip } from "../Chips/OfferChip";
import { FetchedOffer } from "../../hooks/useKittyOffer";

interface CatCardProps {
  kitty: FetchedKitty | null;
  offer: FetchedOffer | null;
  isFetching?: boolean;
  hasError?: boolean;
  isBreedable?: boolean;
  onBreed?: (kitty1: FetchedKitty, kitty2: FetchedKitty) => void;
}

const SkeletonCard = () => {
  return null;
};

const ErrorCard = () => {
  return null;
};

export const KittyCard = ({
  kitty,
  isFetching = false,
  hasError = false,
  isBreedable = false,
  onBreed,
  offer,
}: CatCardProps) => {
  const history = useHistory();
  const [{ isDragging }, drag] = useDrag({
    canDrag: () => isBreedable,
    item: { type: ItemTypes.BREED_CARD, kitty },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.BREED_CARD,
    canDrop: () => isBreedable,
    drop:
      onBreed && !!kitty
        ? (item) => onBreed((item as any).kitty, kitty)
        : undefined,
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  const handleClick = () => {
    if (!kitty) {
      return;
    }

    history.push(`/kitty/${kitty.id}`);
  };

  if (isFetching) {
    return <SkeletonCard />;
  }

  if (hasError || !kitty) {
    return <ErrorCard />;
  }

  return (
    <div ref={drop}>
      <Card
        raised={isBreedable}
        innerRef={drag}
        style={{
          opacity: isDragging ? 0.2 : 1,
          cursor: "move",
          border: isOver ? `2px ${primaryColor} solid` : undefined,
        }}
      >
        <CardActionArea onClick={handleClick} focusRipple disableRipple>
          <CardContent>
            <Cat dna={kitty.genes} />
            <Typography variant="h5" component="h2" gutterBottom>
              # {kitty.id}
            </Typography>
            <GenChip gen={kitty.generation} />
            {offer ? <OfferChip offer={offer} /> : null}
          </CardContent>
        </CardActionArea>
      </Card>
    </div>
  );
};
