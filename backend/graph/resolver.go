package graph

import (
	"collegeerp/agentclient"
	"collegeerp/presence"

	"gorm.io/gorm"
)

// Resolver is the root resolver for all GraphQL operations.
// Every domain resolver file in this package embeds queryResolver or mutationResolver,
// which both embed this struct, giving all resolvers access to DB.
type Resolver struct {
	DB       *gorm.DB
	Presence *presence.Hub
	Agent    *agentclient.Client
}

func (r *Resolver) Query() QueryResolver       { return &queryResolver{r} }
func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

type queryResolver struct{ *Resolver }
type mutationResolver struct{ *Resolver }
